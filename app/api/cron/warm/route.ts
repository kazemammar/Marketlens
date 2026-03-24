// GET /api/cron/warm
// Cache-warming cron — runs every hour on weekdays during US market hours.
// Warms the most-frequently-read endpoints so the first real user request
// always hits a warm cache (no cold-start latency spikes).
//
// Vercel Hobby plan allows only 1 cron job (runs at most once/day).
// This single cron warms all caches AND runs daily tasks (snapshots).
// For frequent warming during market hours, set up an external cron:
//   Service: https://cron-job.org (free)
//   URL: https://marketlens.live/api/cron/warm
//   Schedule: Every 15 minutes, Mon-Fri 13:00-21:00 UTC
//   Auth header: Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'

const TABS = ['stock', 'crypto', 'forex', 'commodity', 'etf'] as const

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
      const r = await fetch(`${base}${path}`, { headers: h })
      results[key] = { ok: r.ok, status: r.status }
    } catch (err) {
      results[key] = { ok: false, error: String(err) }
    }
  }

  await Promise.allSettled([
    // Market tabs — the homepage card grids
    ...TABS.map((tab) => warm(`market_${tab}`, `/api/market?tab=${tab}`)),
    // Warroom feeds
    warm('market_pulse',  '/api/market-pulse'),
    warm('market_brief',  '/api/market-brief'),
    warm('signals',       '/api/signals'),
    warm('movers',        '/api/movers'),
    warm('news',               '/api/news?page=1&limit=50'),
    warm('economics',          '/api/economics'),
    warm('market_risk',        '/api/market-risk'),
    warm('economic_calendar',  '/api/economic-calendar'),
    warm('earnings_calendar',  '/api/earnings-calendar'),
    warm('trending',           '/api/trending'),
    warm('chokepoints',        '/api/chokepoints'),
    warm('energy',             '/api/energy'),
    warm('central_banks',      '/api/central-banks'),
    warm('forex_strength',     '/api/forex/strength'),
    warm('predictions',        '/api/predictions'),
    warm('fear_greed',         '/api/fear-greed'),
    warm('commodities_strip',  '/api/commodities-strip'),
    // Daily tasks (previously a separate cron — merged for Hobby plan 1-cron limit)
    warm('portfolio_snapshots', '/api/cron/snapshot'),
  ])

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
