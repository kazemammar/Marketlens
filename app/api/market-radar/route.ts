import { NextResponse }      from 'next/server'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { redis }             from '@/lib/cache/redis'
import type {
  SignalVerdict,
  RadarSignal,
  MarketRadarPayload,
} from '@/lib/api/homepage'

// Re-export so existing imports from this route file still work
export type { SignalVerdict, RadarSignal, MarketRadarPayload }

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'market-radar:v2'
const CACHE_TTL = 300 // 5 min

const SYMBOLS = ['SPY', 'QQQ', 'GLD', 'USO', 'VXX', 'TLT', 'BTC']

export async function GET() {
  try {
    const cached = await redis.get<MarketRadarPayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const symbols = SYMBOLS.filter((s) => s !== 'BTC')
  const quotes  = await getQuotesBatched(symbols)

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

  // ── Gold (safe haven) ────────────────────────────────────────────
  const gld = quotes.get('GLD')
  if (gld) {
    const riskOff = gld.changePercent > 1.2
    const v: SignalVerdict = riskOff ? 'CASH' : 'BUY'
    riskOff ? cashVotes++ : buyVotes++
    signals.push({ name: 'Gold', verdict: v, value: `${gld.changePercent > 0 ? '+' : ''}${gld.changePercent.toFixed(2)}%`, reason: riskOff ? 'Rising gold = risk-off rotation' : 'Gold stable — no flight to safety' })
  }

  // ── Oil / inflation proxy ────────────────────────────────────────
  const uso = quotes.get('USO')
  if (uso) {
    const inflPressure = uso.changePercent > 2.5
    const v: SignalVerdict = inflPressure ? 'MIXED' : 'BUY'
    inflPressure ? cashVotes++ : buyVotes++
    signals.push({ name: 'WTI Oil', verdict: v, value: `${uso.changePercent > 0 ? '+' : ''}${uso.changePercent.toFixed(2)}%`, reason: inflPressure ? 'High oil = inflation risk' : 'Oil stable — inflation contained' })
  }

  // ── Treasuries trend (risk off if TLT rising) ────────────────────
  const tlt = quotes.get('TLT')
  if (tlt) {
    const bondRally = tlt.changePercent > 0.8
    const v: SignalVerdict = bondRally ? 'CASH' : 'BUY'
    bondRally ? cashVotes++ : buyVotes++
    signals.push({ name: 'US Bonds (TLT)', verdict: v, value: `${tlt.changePercent > 0 ? '+' : ''}${tlt.changePercent.toFixed(2)}%`, reason: bondRally ? 'Bond rally = risk-off' : 'Bonds weak — money in equities' })
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

  try {
    await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL })
  } catch { /* non-fatal */ }

  return NextResponse.json(payload)
}
