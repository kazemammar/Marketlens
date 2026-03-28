// GET /api/cron/warm
// Vercel Hobby plan only allows 1 cron job.
// This endpoint warms the most critical homepage panels.
//
// AI-powered endpoints (market-brief, trade-ideas, earnings-preview,
// market-events, sector-narratives) are excluded — they take 5-10s via Groq
// and have 30min-24hr cache TTLs, so they warm on first user visit.
// Long-TTL endpoints (economics 6hr, central-banks 6hr, calendars 1hr)
// are also excluded — they stay cached for hours.
//
// External cron: https://cron-job.org (free)
//   URL: https://marketlens.live/api/cron/warm
//   Schedule: Every 60 minutes
//   Timeout: 30s (free tier max)
//   Auth header: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { redis }                    from '@/lib/cache/redis'
import crypto                       from 'crypto'

const NEWS_ARCHIVE_KEY = 'news:archive'
const NEWS_SEEN_KEY    = 'news:seen'
const ARCHIVE_TTL      = 7 * 24 * 3600 // 7 days

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketlens.live'
  const h: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {}

  // Fetch + return JSON for endpoints we need to post-process
  const warmAndReturn = async (key: string, path: string) => {
    try {
      const r = await fetch(`${base}${path}`, {
        headers: h,
        signal: AbortSignal.timeout(8000),
      })
      results[key] = { ok: r.ok, status: r.status }
      if (r.ok) return r.json()
    } catch (err) {
      results[key] = { ok: false, error: String(err) }
    }
    return null
  }

  const warm = async (key: string, path: string) => {
    try {
      const r = await fetch(`${base}${path}`, {
        headers: h,
        signal: AbortSignal.timeout(8000),
      })
      results[key] = { ok: r.ok, status: r.status }
    } catch (err) {
      results[key] = { ok: false, error: String(err) }
    }
  }

  // All in parallel — only fast endpoints that serve the homepage.
  const [newsData] = await Promise.all([
    warmAndReturn('news', '/api/news?page=1&limit=50'),
    // Fire-and-forget the rest
    Promise.allSettled([
      warm('market_stock',      '/api/market?tab=stock'),
      warm('market_crypto',     '/api/market?tab=crypto'),
      warm('market_pulse',      '/api/market-pulse'),
      warm('signals',           '/api/signals'),
      warm('movers',            '/api/movers'),
      warm('market_risk',       '/api/market-risk'),
      warm('trending',          '/api/trending'),
      warm('fear_greed',        '/api/fear-greed'),
      warm('commodities_strip', '/api/commodities-strip'),
      warm('chokepoints',       '/api/chokepoints'),
      warm('energy',            '/api/energy'),
      warm('earthquakes',       '/api/earthquakes'),
      warm('news_heat',         '/api/news-heat'),
    ]),
  ])

  // ── Archive articles into Redis sorted set ──────────────────────────────
  let archived = 0
  if (newsData?.articles?.length) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const articles: any[] = newsData.articles
      // Get already-seen headline hashes to avoid duplicates
      const hashes = articles.map(a =>
        crypto.createHash('md5').update(a.headline ?? a.title ?? '').digest('hex').slice(0, 12)
      )
      // Check which are new (pipeline SISMEMBER)
      const seenChecks = await Promise.all(hashes.map(h => redis.sismember(NEWS_SEEN_KEY, h)))

      const pipeline: Promise<unknown>[] = []
      articles.forEach((a, i) => {
        if (seenChecks[i]) return // already archived
        const ts = a.publishedAt ?? Date.now()
        const entry = JSON.stringify({
          headline: a.headline ?? a.title ?? '',
          source:   a.source ?? '',
          url:      a.url ?? a.link ?? null,
          imageUrl: a.imageUrl ?? a.image ?? a.thumbnail ?? null,
          publishedAt: ts,
        })
        pipeline.push(redis.zadd(NEWS_ARCHIVE_KEY, { score: ts, member: entry }))
        pipeline.push(redis.sadd(NEWS_SEEN_KEY, hashes[i]))
        archived++
      })
      if (pipeline.length > 0) await Promise.allSettled(pipeline)
      // Set TTL on both keys (refreshed each cron run)
      await Promise.allSettled([
        redis.expire(NEWS_ARCHIVE_KEY, ARCHIVE_TTL),
        redis.expire(NEWS_SEEN_KEY, ARCHIVE_TTL),
      ])
    } catch (err) {
      results.archive = { ok: false, error: String(err) }
    }
  }
  results.archive = { ok: true, archived }

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
