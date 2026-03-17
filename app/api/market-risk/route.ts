import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'
import { MarketBriefPayload } from '@/app/api/market-brief/route'

export const dynamic = 'force-dynamic'

export interface BreakdownItem {
  key:      string
  category: string
  score:    number   // 0–100
  color:    string
}

export interface MarketRiskPayload {
  score:          number   // 0–100 (higher = more risk)
  level:          'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  label:          string
  color:          string
  factors:        string[]
  opportunities?: string[]
  threats?:       string[]
  breakdown:      BreakdownItem[]
  updatedAt:      number
}

const BRIEF_KEY = 'market-brief:daily'
const RISK_KEY  = 'market-risk:v4'
const CACHE_TTL = 1_800

// ─── Category keyword lists ────────────────────────────────────────────────

const GEO_KEYWORDS = [
  'war', 'conflict', 'military', 'troops', 'missile', 'nuclear', 'invasion',
  'sanction', 'sanctions', 'embargo', 'tariff', 'tariffs', 'trade war', 'trade dispute',
  'geopolit', 'escalat', 'tension', 'tensions',
  'nato', 'ukraine', 'russia', 'china', 'taiwan', 'iran', 'north korea', 'middle east',
  'terrorism', 'coup', 'election',
]

const MKT_KEYWORDS = [
  'stock', 'stocks', 'equity', 'equities', 'nasdaq', 'market', 'markets',
  'vix', 'volatil', 'earnings', 'bear', 'bull', 'rally', 'selloff', 'sell-off', 'correction',
  's&p', 'dow', 'russell', 'liquidity', 'hedge', 'fund', 'investor', 'investors',
  'tech sector', 'financial sector', 'bank sector', 'valuation',
]

const MCR_KEYWORDS = [
  'fed', 'federal reserve', 'inflation', 'inflationary', 'deflation',
  'rate', 'rates', 'interest rate', 'rate hike', 'rate cut',
  'gdp', 'cpi', 'pce', 'ppi', 'nonfarm', 'payroll', 'jobs', 'employment', 'unemployment',
  'recession', 'debt', 'deficit', 'yield', 'yields', 'bond', 'treasury',
  'central bank', 'monetary', 'fiscal', 'tightening', 'easing', 'dovish', 'hawkish',
  'dollar', 'currency', 'macro',
]

const CMD_KEYWORDS = [
  'oil', 'crude', 'brent', 'wti', 'gold', 'silver', 'copper', 'platinum',
  'wheat', 'corn', 'soybean', 'gas', 'natural gas', 'lng',
  'commodity', 'commodities', 'opec', 'energy', 'mining',
  'supply chain', 'food', 'metal',
]

// ─── Score computation ─────────────────────────────────────────────────────

function computeCategoryScores(brief: MarketBriefPayload): { breakdown: BreakdownItem[]; overallScore: number } {
  const corpus = (
    brief.brief + ' ' +
    brief.risks.join(' ') + ' ' +
    brief.opportunities.join(' ')
  ).toLowerCase()

  // ── Geopolitical ──
  const geoKeyHits = GEO_KEYWORDS.filter((w) => corpus.includes(w)).length
  const geoAssetHits = brief.affectedAssets.filter((a) =>
    ['GLD', 'SLV', 'GC=F', 'USO', 'CL=F', 'USD/JPY'].includes(a.symbol)
  ).length
  const geoScore = Math.round(Math.max(15, Math.min(95, 15 + geoKeyHits * 4.5 + geoAssetHits * 5)))

  // ── Market ──
  const mktKeyHits = MKT_KEYWORDS.filter((w) => corpus.includes(w)).length
  const bearishEquity = brief.affectedAssets.filter((a) =>
    (a.type === 'stock' || a.type === 'etf') &&
    (a.direction === 'down' || a.direction === 'volatile')
  ).length
  const vixBonus = brief.affectedAssets.some((a) => a.symbol === 'VIX') ? 8 : 0
  const mktScore = Math.round(Math.max(15, Math.min(95, 15 + mktKeyHits * 3.5 + bearishEquity * 6 + vixBonus)))

  // ── Macro ──
  const mcrKeyHits = MCR_KEYWORDS.filter((w) => corpus.includes(w)).length
  const macroAssets = brief.affectedAssets.filter((a) =>
    a.type === 'forex' || ['TLT', 'VIX'].includes(a.symbol)
  ).length
  const mcrScore = Math.round(Math.max(15, Math.min(95, 15 + mcrKeyHits * 3.0 + macroAssets * 5)))

  // ── Commodity ──
  const cmdKeyHits = CMD_KEYWORDS.filter((w) => corpus.includes(w)).length
  const cmdSymbols = new Set<string>()
  brief.affectedAssets.forEach((a) => {
    if (a.type === 'commodity') cmdSymbols.add(a.symbol)
    if (['USO', 'GLD', 'SLV', 'GC=F', 'CL=F'].includes(a.symbol)) cmdSymbols.add(a.symbol)
  })
  const cmdScore = Math.round(Math.max(15, Math.min(95, 15 + cmdKeyHits * 4.0 + cmdSymbols.size * 6)))

  // ── Overall score ──────────────────────────────────────────────────────
  // Base: weighted average (geo/mkt 30%, macro 25%, commodity 15%)
  const weightedAvg = Math.round(
    geoScore * 0.30 +
    mktScore * 0.30 +
    mcrScore * 0.25 +
    cmdScore * 0.15
  )
  // Crisis amplifier: a single dominant category (e.g. active conflict) should
  // pull the overall up — otherwise weighted avg suppresses real extremes.
  const maxCatScore = Math.max(geoScore, mktScore, mcrScore, cmdScore)
  const amplified   = Math.round(maxCatScore * 0.75)
  const overallScore = Math.max(weightedAvg, amplified)

  return {
    breakdown: [
      { key: 'geo', category: 'Geopolitical', score: geoScore, color: '#ff4444' },
      { key: 'mkt', category: 'Market',       score: mktScore, color: '#f59e0b' },
      { key: 'mcr', category: 'Macro',        score: mcrScore, color: '#f97316' },
      { key: 'cmd', category: 'Commodity',    score: cmdScore, color: '#22d3ee' },
    ],
    overallScore: Math.max(10, Math.min(95, overallScore)),
  }
}

function scoreToLevel(score: number): MarketRiskPayload['level'] {
  if (score >= 75) return 'CRITICAL'
  if (score >= 55) return 'HIGH'
  if (score >= 35) return 'MODERATE'
  return 'LOW'
}

const LEVEL_META: Record<MarketRiskPayload['level'], { label: string; color: string }> = {
  LOW:      { label: 'Low Risk',      color: '#22c55e' },
  MODERATE: { label: 'Moderate Risk', color: '#f59e0b' },
  HIGH:     { label: 'High Risk',     color: '#f97316' },
  CRITICAL: { label: 'Critical',      color: '#ef4444' },
}

export async function GET() {
  // Return cached risk score if available
  try {
    const cached = await redis.get<MarketRiskPayload>(RISK_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Derive from cached market brief (no extra AI call)
  try {
    const brief = await redis.get<MarketBriefPayload>(BRIEF_KEY)
    if (!brief) {
      const defaultPayload: MarketRiskPayload = {
        score:         45,
        level:         'MODERATE',
        label:         'Moderate Risk',
        color:         '#f59e0b',
        factors:       ['Awaiting market brief data', 'Macro uncertainty remains', 'Monitor central bank signals'],
        opportunities: ['Monitor for dip-buying setups'],
        threats:       ['Awaiting market brief data'],
        breakdown: [
          { key: 'geo', category: 'Geopolitical', score: 40, color: '#ff4444' },
          { key: 'mkt', category: 'Market',       score: 45, color: '#f59e0b' },
          { key: 'mcr', category: 'Macro',        score: 40, color: '#f97316' },
          { key: 'cmd', category: 'Commodity',    score: 30, color: '#22d3ee' },
        ],
        updatedAt: Date.now(),
      }
      return NextResponse.json(defaultPayload)
    }

    const { breakdown, overallScore } = computeCategoryScores(brief)
    const level = scoreToLevel(overallScore)
    const meta  = LEVEL_META[level]

    const payload: MarketRiskPayload = {
      score:         overallScore,
      level,
      label:         meta.label,
      color:         meta.color,
      factors:       brief.risks,
      opportunities: brief.opportunities,
      threats:       brief.risks,
      breakdown,
      updatedAt:     brief.generatedAt,
    }

    redis.set(RISK_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[api/market-risk]', err)
    return NextResponse.json({ error: 'Risk score unavailable' }, { status: 503 })
  }
}
