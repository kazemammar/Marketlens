import { NextResponse }          from 'next/server'
import { getQuotesBatched }      from '@/lib/api/finnhub'
import { getYahooQuotesBatch }   from '@/lib/api/yahoo'
import { redis }                 from '@/lib/cache/redis'
import type {
  SignalVerdict,
  RadarSignal,
  MarketRadarPayload,
} from '@/lib/api/homepage'

// Re-export so existing imports from this route file still work
export type { SignalVerdict, RadarSignal, MarketRadarPayload }

export const dynamic = 'force-dynamic'

// Short 90s route cache — protects Redis from concurrent users all triggering
// simultaneous quote reads. 90s is negligible vs the 15-min quote TTL.
const CACHE_KEY = 'market-radar:v4'
const CACHE_TTL = 90

// ETF symbols fetched via Finnhub
const ETF_SYMBOLS  = ['SPY', 'QQQ', 'VXX', 'TLT']
// Commodity futures fetched via Yahoo Finance — same source as the rest of the page
const CMDTY_SYMBOLS = ['GC=F', 'CL=F', 'BZ=F']

export async function GET() {
  // Return cached payload if fresh
  try {
    const cached = await redis.get<MarketRadarPayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch ETFs (Finnhub) and commodities (Yahoo) in parallel
  const [quotes, cmdtyQuotes] = await Promise.all([
    getQuotesBatched(ETF_SYMBOLS),
    getYahooQuotesBatch(CMDTY_SYMBOLS).catch(() => []),
  ])

  // Map commodity futures by symbol for easy lookup
  const cmdty = Object.fromEntries(cmdtyQuotes.map(q => [q.symbol, q]))

  const signals: RadarSignal[] = []
  let buyVotes  = 0
  let cashVotes = 0

  // ── S&P 500 trend ────────────────────────────────────────────────
  const spy = quotes.get('SPY')
  if (spy) {
    const pct = spy.changePercent
    const v: SignalVerdict = pct > 0 ? 'BUY' : 'CASH'
    pct > 0 ? buyVotes++ : cashVotes++
    signals.push({ name: 'S&P 500', verdict: v, value: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, reason: v === 'BUY' ? 'Market advancing' : 'Market declining' })
  }

  // ── Nasdaq trend ─────────────────────────────────────────────────
  const qqq = quotes.get('QQQ')
  if (qqq) {
    const pct = qqq.changePercent
    const v: SignalVerdict = pct > 0 ? 'BUY' : 'CASH'
    pct > 0 ? buyVotes++ : cashVotes++
    signals.push({ name: 'Nasdaq', verdict: v, value: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, reason: v === 'BUY' ? 'Tech advancing' : 'Tech under pressure' })
  }

  // ── VIX proxy (VXX) ──────────────────────────────────────────────
  const vxx = quotes.get('VXX')
  if (vxx) {
    const fearful = vxx.price > 20 || vxx.changePercent > 5
    const v: SignalVerdict = fearful ? 'CASH' : 'BUY'
    fearful ? cashVotes += 2 : buyVotes++
    signals.push({ name: 'Volatility (VXX)', verdict: v, value: `$${vxx.price.toFixed(2)}`, reason: fearful ? 'Elevated fear — reduce risk' : 'Low volatility — conducive to gains' })
  }

  // ── Gold safe-haven signal (GC=F via Yahoo — same source as commodities strip) ──
  const gold = cmdty['GC=F']
  if (gold) {
    const pct     = gold.changePercent
    const riskOff = pct > 1.2   // sharp gold rally = flight to safety = bad for equities
    const v: SignalVerdict = riskOff ? 'CASH' : 'BUY'
    riskOff ? cashVotes++ : buyVotes++
    // Signal is a risk-appetite indicator: green = gold calm = equities bullish
    // (NOT a directional gold call — the value shows gold's actual move for context)
    signals.push({
      name:    'Gold (Safe Haven)',
      verdict: v,
      value:   `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      reason:  riskOff ? 'Gold surging — risk-off rotation into safety' : `Gold ${pct < 0 ? 'falling' : 'calm'} — no safe-haven demand`,
    })
  }

  // ── WTI Oil / inflation proxy (CL=F via Yahoo) ───────────────────
  const wti = cmdty['CL=F']
  if (wti) {
    const pct          = wti.changePercent
    const inflPressure = pct > 2.5
    const v: SignalVerdict = inflPressure ? 'CASH' : 'BUY'
    inflPressure ? cashVotes++ : buyVotes++
    signals.push({
      name:    'WTI Oil',
      verdict: v,
      value:   `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      reason:  inflPressure ? 'Oil surging — inflation risk rising' : 'Oil stable — inflation contained',
    })
  }

  // ── Brent Oil (BZ=F via Yahoo) ───────────────────────────────────
  const brent = cmdty['BZ=F']
  if (brent) {
    const pct          = brent.changePercent
    const inflPressure = pct > 2.5
    const v: SignalVerdict = inflPressure ? 'CASH' : 'BUY'
    inflPressure ? cashVotes++ : buyVotes++
    signals.push({
      name:    'Brent Oil',
      verdict: v,
      value:   `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      reason:  inflPressure ? 'Brent surging — global energy inflation risk' : 'Brent stable — no energy price shock',
    })
  }

  // ── Treasuries trend (risk off if TLT rising) ────────────────────
  const tlt = quotes.get('TLT')
  if (tlt) {
    const bondRally = tlt.changePercent > 0.8
    const v: SignalVerdict = bondRally ? 'CASH' : 'BUY'
    bondRally ? cashVotes++ : buyVotes++
    const tltReason = bondRally ? 'Bond rally = risk-off' : tlt.changePercent < 0 ? 'Bonds weak — money in equities' : 'Bonds stable — no flight to safety'
    signals.push({ name: 'US Bonds (TLT)', verdict: v, value: `${tlt.changePercent > 0 ? '+' : ''}${tlt.changePercent.toFixed(2)}%`, reason: tltReason })
  }

  // ── BTC from CoinGecko (risk-on proxy) ───────────────────────────
  try {
    const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', { next: { revalidate: 300 } })
    if (btcRes.ok) {
      const btcData = await btcRes.json() as { bitcoin: { usd: number; usd_24h_change: number } }
      const price  = btcData.bitcoin.usd
      const change = btcData.bitcoin.usd_24h_change
      const riskOn = price > 55_000 && change > -3
      const v: SignalVerdict = riskOn ? 'BUY' : 'CASH'
      riskOn ? buyVotes++ : cashVotes++
      signals.push({ name: 'Bitcoin', verdict: v, value: `$${(price / 1000).toFixed(1)}K`, reason: riskOn ? 'BTC above $55K — risk appetite healthy' : 'BTC weak — crypto risk-off' })
    }
  } catch { /* non-fatal */ }

  // ── Final verdict ────────────────────────────────────────────────
  const total   = buyVotes + cashVotes || 1
  const score   = Math.round((buyVotes / total) * 100)
  let verdict: SignalVerdict = 'MIXED'
  if (score >= 60) verdict = 'BUY'
  else if (score <= 40) verdict = 'CASH'

  const payload: MarketRadarPayload = {
    verdict,
    score,
    signals,
    updatedAt: Date.now(),
  }

  // Cache for 90s to absorb concurrent requests
  redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})

  return NextResponse.json(payload)
}
