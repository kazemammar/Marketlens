// GET /api/cron/warm
// Cache-warming cron — runs every hour on weekdays during US market hours.
// Warms the most-frequently-read endpoints so the first real user request
// always hits a warm cache (no cold-start latency spikes).

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
    warm('news',          '/api/news?page=1&limit=50'),
    warm('economics',     '/api/economics'),
    warm('market_risk',   '/api/market-risk'),
  ])

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
