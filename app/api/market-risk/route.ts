import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'
import type { MarketBriefPayload, AffectedAsset } from '@/app/api/market-brief/route'

export type { AffectedAsset }

export const dynamic = 'force-dynamic'

export interface BreakdownItem {
  key:      string
  category: string
  score:    number   // 0–100
  color:    string
}

export interface CategoryDetail {
  keywords: string[]   // top matched keywords (up to 4)
  drivers:  string[]   // risk strings containing those keywords (up to 2)
  weight:   number     // scoring weight (0.15–0.30)
}

export interface HistoryPoint {
  score:     number
  timestamp: number
}

export interface MarketRiskPayload {
  score:            number   // 0–100 (higher = more risk)
  level:            'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  label:            string
  color:            string
  factors:          string[]
  opportunities?:   string[]
  threats?:         string[]
  breakdown:        BreakdownItem[]
  categoryDetails?: Record<string, CategoryDetail>
  history?:         HistoryPoint[]
  briefText?:       string
  affectedAssets?:  AffectedAsset[]
  updatedAt:        number
}

const BRIEF_KEY   = 'market-brief:daily'
const RISK_KEY    = 'market-risk:v6'
const HISTORY_KEY = 'market-risk:history'
const CACHE_TTL   = 1_800  // 30 minutes — brief only changes hourly, no value recomputing more often
const HISTORY_MAX = 12     // ~6 hours at 30-min intervals

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

// Word-boundary match to avoid false positives ("stock" matching "stockpile")
function matchesKeyword(corpus: string, keyword: string): boolean {
  // Multi-word keywords (e.g. "trade war") use simple includes — false positives unlikely
  if (keyword.includes(' ')) return corpus.includes(keyword)
  // Single-word: use word boundary regex
  const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
  return re.test(corpus)
}

function computeCategoryScores(brief: MarketBriefPayload): {
  breakdown:       BreakdownItem[]
  overallScore:    number
  categoryDetails: Record<string, CategoryDetail>
} {
  const corpus = (brief.brief + ' ' + brief.risks.join(' ')).toLowerCase()

  // ── Geopolitical ──
  const geoMatched   = GEO_KEYWORDS.filter((w) => matchesKeyword(corpus, w))
  const geoAssetHits = brief.affectedAssets.filter((a) =>
    ['GLD', 'SLV', 'GC=F', 'USO', 'CL=F', 'USD/JPY'].includes(a.symbol)
  ).length
  const geoScore      = Math.round(Math.max(15, Math.min(95, 15 + Math.sqrt(geoMatched.length) * 12 + geoAssetHits * 5)))
  const geoDriversRaw = brief.risks.filter((r) => geoMatched.some((kw) => r.toLowerCase().includes(kw)))
  const geoDrivers    = (geoDriversRaw.length > 0 ? geoDriversRaw : brief.risks).slice(0, 2)

  // ── Market ──
  const mktMatched    = MKT_KEYWORDS.filter((w) => matchesKeyword(corpus, w))
  const bearishEquity = brief.affectedAssets.filter((a) =>
    (a.type === 'stock' || a.type === 'etf') &&
    (a.direction === 'down' || a.direction === 'volatile')
  ).length
  const vixBonus   = brief.affectedAssets.some((a) => a.symbol === 'VIX') ? 8 : 0
  const mktScore      = Math.round(Math.max(15, Math.min(95, 15 + Math.sqrt(mktMatched.length) * 10 + bearishEquity * 6 + vixBonus)))
  const mktDriversRaw = brief.risks.filter((r) => mktMatched.some((kw) => r.toLowerCase().includes(kw)))
  const mktDrivers    = (mktDriversRaw.length > 0 ? mktDriversRaw : brief.risks).slice(0, 2)

  // ── Macro ──
  const mcrMatched  = MCR_KEYWORDS.filter((w) => matchesKeyword(corpus, w))
  const macroAssets = brief.affectedAssets.filter((a) =>
    a.type === 'forex' || ['TLT', 'VIX'].includes(a.symbol)
  ).length
  const mcrScore      = Math.round(Math.max(15, Math.min(95, 15 + Math.sqrt(mcrMatched.length) * 9 + macroAssets * 5)))
  const mcrDriversRaw = brief.risks.filter((r) => mcrMatched.some((kw) => r.toLowerCase().includes(kw)))
  const mcrDrivers    = (mcrDriversRaw.length > 0 ? mcrDriversRaw : brief.risks).slice(0, 2)

  // ── Commodity ──
  const cmdMatched = CMD_KEYWORDS.filter((w) => matchesKeyword(corpus, w))
  const cmdSymbols = new Set<string>()
  brief.affectedAssets.forEach((a) => {
    if (a.type === 'commodity') cmdSymbols.add(a.symbol)
    if (['USO', 'GLD', 'SLV', 'GC=F', 'CL=F'].includes(a.symbol)) cmdSymbols.add(a.symbol)
  })
  const cmdScore      = Math.round(Math.max(15, Math.min(95, 15 + Math.sqrt(cmdMatched.length) * 11 + cmdSymbols.size * 6)))
  const cmdDriversRaw = brief.risks.filter((r) => cmdMatched.some((kw) => r.toLowerCase().includes(kw)))
  const cmdDrivers    = (cmdDriversRaw.length > 0 ? cmdDriversRaw : brief.risks).slice(0, 2)

  // ── Overall ──
  const weightedAvg = Math.round(
    geoScore * 0.30 +
    mktScore * 0.30 +
    mcrScore * 0.25 +
    cmdScore * 0.15
  )
  const maxCatScore  = Math.max(geoScore, mktScore, mcrScore, cmdScore)
  const amplified    = Math.round(maxCatScore * 0.85)
  const overallScore = Math.max(10, Math.min(95, Math.max(weightedAvg, amplified)))

  return {
    breakdown: [
      { key: 'geo', category: 'Geopolitical', score: geoScore, color: '#ff4444' },
      { key: 'mkt', category: 'Market',       score: mktScore, color: '#f59e0b' },
      { key: 'mcr', category: 'Macro',        score: mcrScore, color: '#f97316' },
      { key: 'cmd', category: 'Commodity',    score: cmdScore, color: '#22d3ee' },
    ],
    overallScore,
    categoryDetails: {
      geo: { keywords: geoMatched.slice(0, 4), drivers: geoDrivers, weight: 0.30 },
      mkt: { keywords: mktMatched.slice(0, 4), drivers: mktDrivers, weight: 0.30 },
      mcr: { keywords: mcrMatched.slice(0, 4), drivers: mcrDrivers, weight: 0.25 },
      cmd: { keywords: cmdMatched.slice(0, 4), drivers: cmdDrivers, weight: 0.15 },
    },
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

// ─── History helpers ───────────────────────────────────────────────────────

async function readHistory(): Promise<HistoryPoint[]> {
  try {
    const raw = await redis.lrange(HISTORY_KEY, 0, -1)
    return (raw as unknown[]).map((entry) => {
      if (typeof entry === 'string') return JSON.parse(entry) as HistoryPoint
      return entry as HistoryPoint
    })
  } catch {
    return []
  }
}

async function appendHistory(point: HistoryPoint): Promise<void> {
  try {
    const serialized = JSON.stringify(point)
    await redis.lpush(HISTORY_KEY, serialized)
    await redis.ltrim(HISTORY_KEY, 0, HISTORY_MAX - 1)
    await redis.expire(HISTORY_KEY, 86400) // 24h
  } catch (err) {
    // WRONGTYPE error: key exists with wrong type — delete and retry once
    const msg = (err as Error).message ?? ''
    if (msg.includes('WRONGTYPE')) {
      try {
        await redis.del(HISTORY_KEY)
        await redis.lpush(HISTORY_KEY, JSON.stringify(point))
        await redis.expire(HISTORY_KEY, 86400)
      } catch { /* non-fatal */ }
    }
  }
}

// ─── Internal brief fetch (resolves race condition) ───────────────────────

async function fetchBrief(reqUrl: string): Promise<MarketBriefPayload | null> {
  try {
    const briefUrl = new URL('/api/market-brief', reqUrl).toString()
    const resp = await fetch(briefUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) return null
    return await resp.json() as MarketBriefPayload
  } catch {
    return null
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Return cached risk score if available
  try {
    const cached = await redis.get<MarketRiskPayload>(RISK_KEY)
    if (cached) {
      const history = await readHistory()
      // Dedup-aware: append to history if last point is >4 minutes old
      const latest = history[0]
      const elapsed = latest ? Date.now() - latest.timestamp : Infinity
      if (elapsed > 25 * 60_000) {
        await appendHistory({ score: cached.score, timestamp: Date.now() })
        // Re-read so the response includes the just-appended point
        const freshHistory = await readHistory()
        return NextResponse.json({ ...cached, history: freshHistory })
      }
      return NextResponse.json({ ...cached, history })
    }
  } catch { /* fall through */ }

  // Derive from cached market brief (no extra AI call)
  try {
    let brief = await redis.get<MarketBriefPayload>(BRIEF_KEY)

    // Race condition fix: if brief not cached yet, trigger generation and wait
    if (!brief) {
      brief = await fetchBrief(req.url)
    }

    if (!brief) {
      const history = await readHistory()
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
        history,
        updatedAt: Date.now(),
      }
      return NextResponse.json(defaultPayload)
    }

    const { breakdown, overallScore, categoryDetails } = computeCategoryScores(brief)
    const level = scoreToLevel(overallScore)
    const meta  = LEVEL_META[level]

    const payload: MarketRiskPayload = {
      score:          overallScore,
      level,
      label:          meta.label,
      color:          meta.color,
      factors:        brief.risks,
      opportunities:  brief.opportunities,
      threats:        brief.risks,
      breakdown,
      categoryDetails,
      briefText:      brief.brief,
      affectedAssets: brief.affectedAssets,
      updatedAt:      brief.generatedAt,
    }

    // Write to history (awaited so readHistory below sees it immediately)
    await appendHistory({ score: overallScore, timestamp: Date.now() })

    // Cache payload (without history — history is always fetched fresh)
    redis.set(RISK_KEY, payload, { ex: CACHE_TTL }).catch(() => {})

    const history = await readHistory()
    return NextResponse.json({ ...payload, history })
  } catch (err) {
    console.error('[api/market-risk]', err)
    return NextResponse.json({ error: 'Risk score unavailable' }, { status: 503 })
  }
}
