import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'
import { MarketBriefPayload } from '@/app/api/market-brief/route'

export const dynamic = 'force-dynamic'

export interface RiskBreakdown {
  geopolitical: number
  market:       number
  macro:        number
  commodity:    number
}

export interface MarketRiskPayload {
  score:          number   // 0–100
  level:          'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  label:          string
  color:          string
  factors:        string[]
  opportunities:  string[]
  breakdown:      RiskBreakdown
  trend:          'RISING' | 'STABLE' | 'EASING'
  history:        number[]  // last 10 scores for sparkline
  affectedAssets: { symbol: string; type: string; direction: 'up' | 'down' | 'volatile' }[]
  updatedAt:      number
}

const BRIEF_KEY   = 'market-brief:daily'
const RISK_KEY    = 'market-risk:v2'
const HISTORY_KEY = 'market-risk:history'
const CACHE_TTL   = 1_800
const HISTORY_MAX = 10

function computeScore(brief: MarketBriefPayload): number {
  let score = 35

  score += Math.min(brief.risks.length * 8, 32)

  const down     = brief.affectedAssets.filter((a) => a.direction === 'down').length
  const volatile = brief.affectedAssets.filter((a) => a.direction === 'volatile').length
  const up       = brief.affectedAssets.filter((a) => a.direction === 'up').length
  const bearBias = (down * 2 + volatile) - up
  score += Math.min(bearBias * 4, 20)

  const highRiskWords = ['war', 'attack', 'sanction', 'crisis', 'crash', 'collapse', 'conflict', 'escalat']
  const briefLower    = brief.brief.toLowerCase()
  score += highRiskWords.filter((w) => briefLower.includes(w)).length * 3

  return Math.max(5, Math.min(98, Math.round(score)))
}

function computeBreakdown(brief: MarketBriefPayload): RiskBreakdown {
  const allText = (brief.brief + ' ' + brief.risks.join(' ')).toLowerCase()

  const geoWords = ['war', 'attack', 'conflict', 'sanction', 'military', 'geopolit', 'invasion',
    'missile', 'iran', 'russia', 'israel', 'china', 'north korea', 'houthi', 'ukraine', 'ceasefire', 'coup']
  const geoHits  = geoWords.filter((w) => allText.includes(w)).length
  const geoAssets = brief.affectedAssets.filter(
    (a) => ['USO', 'GLD', 'VIX'].includes(a.symbol) && a.direction !== 'up',
  ).length
  const geopolitical = Math.min(90, 18 + geoHits * 7 + geoAssets * 9)

  const mktWords = ['vix', 'volatil', 'sell-off', 'selloff', 'correction', 'bear', 'crash', 'risk-off', 'downturn', 'plunge']
  const mktHits  = mktWords.filter((w) => allText.includes(w)).length
  const equityDown = brief.affectedAssets.filter(
    (a) => ['SPY', 'QQQ', 'AAPL', 'NVDA'].includes(a.symbol) && a.direction === 'down',
  ).length
  const market = Math.min(90, 15 + mktHits * 8 + equityDown * 10)

  const macroWords = ['inflation', 'rate hike', 'rate cut', 'recession', 'gdp', 'unemployment',
    'federal reserve', 'central bank', 'yield', 'deficit', 'debt ceiling', 'stagflation', 'fomc', 'cpi']
  const macroHits = macroWords.filter((w) => allText.includes(w)).length
  const macro = Math.min(90, 20 + macroHits * 6)

  const commWords = ['oil', 'crude', 'opec', 'gold', 'commodity', 'energy', 'dollar surge',
    'devaluation', 'currency crisis', 'forex', 'supply shock', 'pipeline']
  const commHits  = commWords.filter((w) => allText.includes(w)).length
  const commAssets = brief.affectedAssets.filter(
    (a) => ['GLD', 'USO', 'SLV', 'EUR/USD', 'USD/JPY', 'GBP/USD'].includes(a.symbol) && a.direction !== 'up',
  ).length
  const commodity = Math.min(90, 15 + commHits * 5 + commAssets * 8)

  return { geopolitical, market, macro, commodity }
}

function scoreToLevel(score: number): MarketRiskPayload['level'] {
  if (score >= 75) return 'CRITICAL'
  if (score >= 55) return 'HIGH'
  if (score >= 35) return 'MODERATE'
  return 'LOW'
}

function computeTrend(history: number[], current: number): MarketRiskPayload['trend'] {
  if (history.length < 2) return 'STABLE'
  const prev = history[history.length - 1]
  const diff = current - prev
  if (diff >= 5)  return 'RISING'
  if (diff <= -5) return 'EASING'
  return 'STABLE'
}

const LEVEL_META: Record<MarketRiskPayload['level'], { label: string; color: string }> = {
  LOW:      { label: 'Low Risk',      color: '#22c55e' },
  MODERATE: { label: 'Moderate Risk', color: '#f59e0b' },
  HIGH:     { label: 'Elevated Risk', color: '#f97316' },
  CRITICAL: { label: 'Critical',      color: '#ef4444' },
}

export async function GET() {
  try {
    const cached = await redis.get<MarketRiskPayload>(RISK_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const brief = await redis.get<MarketBriefPayload>(BRIEF_KEY)

    let history: number[] = []
    try { history = (await redis.get<number[]>(HISTORY_KEY)) ?? [] } catch { /* ignore */ }

    if (!brief) {
      const payload: MarketRiskPayload = {
        score:          45,
        level:          'MODERATE',
        label:          'Moderate Risk',
        color:          '#f59e0b',
        factors:        ['Awaiting market brief data', 'Macro uncertainty persists', 'Monitor central bank signals'],
        opportunities:  ['Defensive assets may offer near-term stability'],
        breakdown:      { geopolitical: 35, market: 40, macro: 50, commodity: 30 },
        trend:          'STABLE',
        history:        history.length > 0 ? history : [38, 40, 42, 43, 45],
        affectedAssets: [],
        updatedAt:      Date.now(),
      }
      return NextResponse.json(payload)
    }

    const score     = computeScore(brief)
    const level     = scoreToLevel(score)
    const meta      = LEVEL_META[level]
    const breakdown = computeBreakdown(brief)
    const trend     = computeTrend(history, score)
    const newHistory = [...history, score].slice(-HISTORY_MAX)

    redis.set(HISTORY_KEY, newHistory, { ex: 7 * 24 * 3600 }).catch(() => {})

    const payload: MarketRiskPayload = {
      score,
      level,
      label:          meta.label,
      color:          meta.color,
      factors:        brief.risks.slice(0, 3),
      opportunities:  (brief.opportunities ?? []).slice(0, 2),
      breakdown,
      trend,
      history:        newHistory,
      affectedAssets: brief.affectedAssets ?? [],
      updatedAt:      brief.generatedAt,
    }

    redis.set(RISK_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[api/market-risk]', err)
    return NextResponse.json({ error: 'Risk score unavailable' }, { status: 503 })
  }
}
