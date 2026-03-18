import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(req: NextRequest) {
  // Verify cron secret if set
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketlens.live'
  const authHeaders: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {}

  // Task 1: Market Brief
  try {
    const briefRes = await fetch(`${base}/api/market-brief`, { headers: authHeaders })
    results.marketBrief = { ok: briefRes.ok, status: briefRes.status }
  } catch (err) {
    results.marketBrief = { ok: false, error: String(err) }
  }

  // Task 2: Portfolio Snapshots
  try {
    const snapRes = await fetch(`${base}/api/cron/snapshot`, { headers: authHeaders })
    results.snapshots = { ok: snapRes.ok, status: snapRes.status }
  } catch (err) {
    results.snapshots = { ok: false, error: String(err) }
  }

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
