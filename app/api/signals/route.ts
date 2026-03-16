import { NextResponse }      from 'next/server'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { redis }             from '@/lib/cache/redis'
import { getFinanceNews }    from '@/lib/api/rss'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'signals:v2'
const CACHE_TTL = 120 // 2 min

export interface Signal {
  id:        string
  icon:      string
  text:      string
  category:  'price' | 'news' | 'technical' | 'macro'
  severity:  'HIGH' | 'MED' | 'LOW'
  timestamp: number
}

const SIGNAL_SYMBOLS = ['SPY', 'QQQ', 'GLD', 'USO', 'BNO', 'UNG', 'TLT', 'VXX', 'WEAT', 'SLV']

const ASSET_LABELS: Record<string, string> = {
  SPY: 'S&P 500', QQQ: 'Nasdaq 100', GLD: 'Gold', USO: 'WTI Crude',
  BNO: 'Brent Crude', UNG: 'Natural Gas', TLT: 'US 10yr Bonds',
  VXX: 'VIX (Volatility)', WEAT: 'Wheat', SLV: 'Silver',
}

const HIGH_NEWS = ['war', 'attack', 'strike', 'sanction', 'blockade', 'invasion', 'missile', 'drone', 'crisis', 'collapse', 'emergency', 'opec cut', 'opec+', 'fed rate', 'rate hike', 'default']
const MED_NEWS  = ['tariff', 'trade deal', 'election', 'gdp', 'inflation', 'deficit', 'regulation', 'summit', 'meeting', 'ban', 'devaluation']

function newsIcon(headline: string): string {
  const h = headline.toLowerCase()
  if (h.includes('oil') || h.includes('opec') || h.includes('crude')) return '🛢️'
  if (h.includes('gold') || h.includes('metal'))                       return '🥇'
  if (h.includes('war') || h.includes('attack') || h.includes('missile')) return '⚔️'
  if (h.includes('fed') || h.includes('rate') || h.includes('fomc'))   return '🏦'
  if (h.includes('crypto') || h.includes('bitcoin'))                   return '₿'
  if (h.includes('sanction'))                                           return '🔒'
  if (h.includes('election'))                                           return '🗳️'
  return '📰'
}

function priceIcon(symbol: string, positive: boolean): string {
  if (['GLD', 'SLV'].includes(symbol)) return positive ? '🥇' : '🥇'
  if (['USO', 'BNO', 'UNG'].includes(symbol)) return positive ? '🛢️' : '🛢️'
  if (symbol === 'VXX')  return positive ? '⚠️' : '✅'
  if (symbol === 'TLT')  return positive ? '🏦' : '🏦'
  if (symbol === 'WEAT') return positive ? '🌾' : '🌾'
  return positive ? '📈' : '📉'
}

function severity(pct: number): Signal['severity'] {
  const abs = Math.abs(pct)
  if (abs >= 3) return 'HIGH'
  if (abs >= 1.5) return 'MED'
  return 'LOW'
}

export async function GET() {
  try {
    const cached = await redis.get<Signal[]>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const signals: Signal[] = []
  const now = Date.now()

  // ── Price-move signals ──────────────────────────────────────────────
  try {
    const quotes = await getQuotesBatched(SIGNAL_SYMBOLS)

    for (const sym of SIGNAL_SYMBOLS) {
      const q = quotes.get(sym)
      if (!q || q.changePercent === 0) continue
      const pct = q.changePercent
      if (Math.abs(pct) < 1.5) continue  // only signal notable moves

      const positive = pct > 0
      const label    = ASSET_LABELS[sym] ?? sym
      const icon     = priceIcon(sym, positive)
      const dir      = positive ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`

      let text = `${label} ${dir}`
      if (sym === 'VXX' && pct > 3)   text += ' — fear elevated, consider hedging'
      else if (sym === 'GLD' && pct > 2) text += ' — safe-haven demand surging'
      else if (sym === 'USO' && pct > 2) text += ' — supply disruption risk'
      else if (sym === 'USO' && pct < -2) text += ' — demand concerns weighing'
      else if (sym === 'TLT' && pct < -1.5) text += ' — yields rising, rate pressure'
      else if (sym === 'TLT' && pct > 1.5)  text += ' — flight to bonds, risk-off'
      else if (sym === 'WEAT' && pct > 2)    text += ' — food commodity stress'
      else if ((sym === 'SPY' || sym === 'QQQ') && pct < -2) text += ' — broad sell-off'
      else if ((sym === 'SPY' || sym === 'QQQ') && pct > 2)  text += ' — rally broadening'

      signals.push({
        id:        `price-${sym}-${now}`,
        icon,
        text,
        category:  'price',
        severity:  severity(pct),
        timestamp: now - Math.floor(Math.random() * 600_000),
      })
    }
  } catch { /* non-fatal */ }

  // ── News keyword signals ────────────────────────────────────────────
  try {
    const articles = await getFinanceNews()
    const seen = new Set<string>()

    for (const a of articles.slice(0, 40)) {
      const lower = a.headline.toLowerCase()
      const matchHigh = HIGH_NEWS.find((k) => lower.includes(k))
      const matchMed  = MED_NEWS.find((k) => lower.includes(k))
      if (!matchHigh && !matchMed) continue

      // Deduplicate by first 50 chars of headline
      const key = a.headline.slice(0, 50)
      if (seen.has(key)) continue
      seen.add(key)

      const truncated = a.headline.length > 72 ? a.headline.slice(0, 72) + '…' : a.headline
      signals.push({
        id:        `news-${a.id ?? a.url}`,
        icon:      newsIcon(a.headline),
        text:      truncated,
        category:  'news',
        severity:  matchHigh ? 'HIGH' : 'MED',
        timestamp: a.publishedAt,
      })

      if (signals.length >= 15) break
    }
  } catch { /* non-fatal */ }

  // ── Sort newest first, cap at 12 ────────────────────────────────────
  const result = signals
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12)

  try {
    await redis.set(CACHE_KEY, result, { ex: CACHE_TTL })
  } catch { /* non-fatal */ }

  return NextResponse.json(result)
}
