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
  // Total: 14 endpoints, each with 8s timeout = well under 20s total.
  await Promise.allSettled([
    warm('market_stock',      '/api/market?tab=stock'),
    warm('market_crypto',     '/api/market?tab=crypto'),
    warm('market_pulse',      '/api/market-pulse'),
    warm('signals',           '/api/signals'),
    warm('movers',            '/api/movers'),
    warm('news',              '/api/news?page=1&limit=50'),
    warm('market_risk',       '/api/market-risk'),
    warm('trending',          '/api/trending'),
    warm('fear_greed',        '/api/fear-greed'),
    warm('commodities_strip', '/api/commodities-strip'),
    warm('chokepoints',       '/api/chokepoints'),
    warm('energy',            '/api/energy'),
    warm('earthquakes',       '/api/earthquakes'),
    warm('news_heat',         '/api/news-heat'),
  ])

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
