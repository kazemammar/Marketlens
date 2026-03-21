import { NextResponse }        from 'next/server'
import { getQuotesBatched }    from '@/lib/api/finnhub'
import { redis }               from '@/lib/cache/redis'
import { getFinanceNews }      from '@/lib/api/rss'
import { HIGH_KW, MED_KW }    from '@/lib/utils/severity-keywords'
import { clusterArticles }     from '@/lib/utils/news-clustering'
import type { NewsCluster }    from '@/lib/utils/news-clustering'
import { explainMove }         from '@/lib/utils/news-correlation'
import type { NewsArticle }    from '@/lib/utils/types'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'signals:v5'
const CACHE_TTL = 300 // 5 min

export interface Signal {
  id:          string
  icon:        string
  text:        string
  category:    'price' | 'news' | 'technical' | 'macro' | 'correlation'
  severity:    'HIGH' | 'MED' | 'LOW'
  timestamp:   number
  explanation?: {
    type:        'explained' | 'silent_divergence'
    headline?:   string
    source?:     string
    sourceCount: number
    confidence:  number
  }
}

const SIGNAL_SYMBOLS = [
  'SPY', 'QQQ', 'GLD', 'USO', 'BNO', 'UNG', 'TLT', 'VXX',
  'WEAT', 'SLV', 'AAPL', 'TSLA', 'NVDA', 'META', 'MSFT', 'JPM', 'XLE', 'XLF',
]

const ASSET_LABELS: Record<string, string> = {
  SPY:  'S&P 500',      QQQ:  'Nasdaq 100',   GLD:  'Gold',
  USO:  'WTI Crude',    BNO:  'Brent Crude',   UNG:  'Natural Gas',
  TLT:  'US 10yr Bonds',VXX:  'VIX',           WEAT: 'Wheat',
  SLV:  'Silver',       AAPL: 'Apple',          TSLA: 'Tesla',
  NVDA: 'Nvidia',       META: 'Meta',           MSFT: 'Microsoft',
  JPM:  'JPMorgan',     XLE:  'Energy Sector',  XLF:  'Financials',
}

// Fallback context for small moves (<1.5%) that don't warrant news correlation
const SIGNAL_CONTEXT: Record<string, { up: string; down: string }> = {
  SPY:  { up: 'broad market rally',        down: 'broad sell-off' },
  QQQ:  { up: 'tech stocks leading',       down: 'tech under pressure' },
  GLD:  { up: 'safe-haven demand',         down: 'risk appetite returning' },
  USO:  { up: 'supply disruption risk',    down: 'demand concerns weighing' },
  BNO:  { up: 'Brent premium widening',    down: 'global demand softening' },
  UNG:  { up: 'heating demand surge',      down: 'storage glut pressuring' },
  TLT:  { up: 'flight to bonds, risk-off', down: 'yields rising, rate pressure' },
  VXX:  { up: 'fear elevated, hedge',      down: 'calm returning to markets' },
  WEAT: { up: 'food commodity stress',     down: 'harvest outlook improving' },
  SLV:  { up: 'industrial demand firm',    down: 'dollar strength weighing' },
  AAPL: { up: 'consumer tech strength',    down: 'iPhone cycle concerns' },
  TSLA: { up: 'EV sentiment improving',    down: 'EV demand uncertainty' },
  NVDA: { up: 'AI spending accelerating',  down: 'chip cycle worries' },
  META: { up: 'ad revenue momentum',       down: 'digital ad slowdown fears' },
  MSFT: { up: 'cloud growth resilient',    down: 'enterprise spending caution' },
  JPM:  { up: 'financials outperforming',  down: 'credit concerns emerging' },
  XLE:  { up: 'energy stocks surging',     down: 'energy sector retreating' },
  XLF:  { up: 'banks leading rally',       down: 'yield curve headwinds' },
}

// Signals route uses shared keyword lists plus a few extra trigger terms
const HIGH_NEWS = [...HIGH_KW, 'fed rate']
const MED_NEWS  = [...MED_KW,  'trade deal', 'summit', 'meeting', 'ban', 'cpi', 'jobs report', 'interest rate', 'central bank', 'federal reserve', 'ipo']

function newsIcon(headline: string): string {
  const h = headline.toLowerCase()
  if (h.includes('oil') || h.includes('opec') || h.includes('crude'))       return '🛢️'
  if (h.includes('gold') || h.includes('metal'))                             return '🥇'
  if (h.includes('war') || h.includes('attack') || h.includes('missile'))   return '⚔️'
  if (h.includes('fed') || h.includes('rate') || h.includes('fomc'))        return '🏦'
  if (h.includes('crypto') || h.includes('bitcoin'))                         return '₿'
  if (h.includes('sanction'))                                                 return '🔒'
  if (h.includes('election'))                                                 return '🗳️'
  if (h.includes('recession') || h.includes('gdp') || h.includes('cpi'))    return '📊'
  if (h.includes('tariff') || h.includes('trade'))                           return '⚖️'
  if (h.includes('earnings') || h.includes('revenue'))                       return '💹'
  return '📰'
}

function priceIcon(symbol: string, positive: boolean): string {
  if (['GLD', 'SLV'].includes(symbol))          return '🥇'
  if (['USO', 'BNO', 'UNG'].includes(symbol))   return '🛢️'
  if (symbol === 'VXX')                          return positive ? '⚠️' : '✅'
  if (symbol === 'TLT')                          return '🏦'
  if (symbol === 'WEAT')                         return '🌾'
  if (['XLE', 'XLF'].includes(symbol))           return positive ? '📈' : '📉'
  if (['AAPL', 'MSFT', 'META', 'NVDA'].includes(symbol)) return positive ? '💻' : '💻'
  if (symbol === 'TSLA')                         return '⚡'
  if (symbol === 'JPM')                          return '🏦'
  return positive ? '📈' : '📉'
}

function severity(pct: number): Signal['severity'] {
  const abs = Math.abs(pct)
  if (abs >= 3)   return 'HIGH'
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

  // ── Fetch news once — shared by price correlation + keyword signals ────────
  let articles: NewsArticle[] = []
  let clusters: NewsCluster[]  = []
  try {
    articles = await getFinanceNews()
    clusters = clusterArticles(articles)
  } catch { /* non-fatal — falls back to SIGNAL_CONTEXT */ }

  // ── Price-move signals ─────────────────────────────────────────────────────
  try {
    const quotes = await getQuotesBatched(SIGNAL_SYMBOLS)

    for (const sym of SIGNAL_SYMBOLS) {
      const q = quotes.get(sym)
      if (!q || q.changePercent === 0) continue
      const pct = q.changePercent
      if (Math.abs(pct) < 0.5) continue

      const positive = pct > 0
      const label    = ASSET_LABELS[sym] ?? sym
      const dir      = positive ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`
      const absMove  = Math.abs(pct)

      // Run correlation only for meaningful moves
      const expl = absMove >= 1.5 ? explainMove(sym, pct, clusters) : null

      // ── Build signal text ──
      let text: string
      if (expl?.type === 'explained' && expl.headline) {
        const headline = expl.headline.length > 100
          ? expl.headline.slice(0, 100) + '…'
          : expl.headline
        text = `${label} ${dir} — ${headline}`
      } else if (expl?.type === 'silent_divergence' && absMove >= 2) {
        text = `${label} ${dir} — no catalyst found`
      } else {
        const ctx = SIGNAL_CONTEXT[sym]
        const context = ctx ? (positive ? ctx.up : ctx.down) : undefined
        text = context ? `${label} ${dir} — ${context}` : `${label} ${dir}`
      }

      const isSilent = expl?.type === 'silent_divergence' && absMove >= 2
      const icon     = isSilent ? '⚡' : priceIcon(sym, positive)

      signals.push({
        id:        `price-${sym}-${now}`,
        icon,
        text,
        category:  isSilent ? 'correlation' : 'price',
        severity:  severity(pct),
        timestamp: now - Math.floor(Math.random() * 600_000),
        ...(absMove >= 1.5 && expl ? {
          explanation: {
            type:        expl.type,
            headline:    expl.headline   ?? undefined,
            source:      expl.source     ?? undefined,
            sourceCount: expl.sourceCount,
            confidence:  expl.confidence,
          },
        } : {}),
      })
    }
  } catch { /* non-fatal */ }

  // ── News keyword signals ───────────────────────────────────────────────────
  try {
    const seen = new Set<string>()

    for (const a of articles.slice(0, 60)) {
      const lower    = a.headline.toLowerCase()
      const matchHigh = HIGH_NEWS.find((k) => lower.includes(k))
      const matchMed  = MED_NEWS.find((k)  => lower.includes(k))
      if (!matchHigh && !matchMed) continue

      const key = a.headline.slice(0, 50)
      if (seen.has(key)) continue
      seen.add(key)

      const truncated = a.headline.length > 160 ? a.headline.slice(0, 160) + '…' : a.headline
      signals.push({
        id:        `news-${a.id ?? a.url}`,
        icon:      newsIcon(a.headline),
        text:      truncated,
        category:  'news',
        severity:  matchHigh ? 'HIGH' : 'MED',
        timestamp: typeof a.publishedAt === 'number' ? a.publishedAt : new Date(a.publishedAt).getTime(),
      })
    }
  } catch { /* non-fatal */ }

  // ── Sort by severity then recency, cap at 20 ──────────────────────────────
  const SEV_ORDER: Record<string, number> = { HIGH: 0, MED: 1, LOW: 2 }
  const result = signals
    .sort((a, b) => {
      const sd = SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
      if (sd !== 0) return sd
      return b.timestamp - a.timestamp
    })
    .slice(0, 20)

  try {
    await redis.set(CACHE_KEY, result, { ex: CACHE_TTL })
  } catch { /* non-fatal */ }

  return NextResponse.json(result)
}
