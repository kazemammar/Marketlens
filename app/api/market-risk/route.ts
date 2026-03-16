import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'
import { MarketBriefPayload } from '@/app/api/market-brief/route'

export const dynamic = 'force-dynamic'

export interface MarketRiskPayload {
  score:     number   // 0–100 (higher = more risk)
  level:     'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  label:     string
  color:     string
  factors:   string[]
  updatedAt: number
}

const BRIEF_KEY = 'market-brief:daily'
const RISK_KEY  = 'market-risk:v1'
const CACHE_TTL = 1_800

function computeScore(brief: MarketBriefPayload): number {
  let score = 35  // baseline moderate

  // More risks → higher score
  score += Math.min(brief.risks.length * 8, 32)

  // Affected assets: count down/volatile vs up
  const down     = brief.affectedAssets.filter((a) => a.direction === 'down').length
  const volatile = brief.affectedAssets.filter((a) => a.direction === 'volatile').length
  const up       = brief.affectedAssets.filter((a) => a.direction === 'up').length
  const bearBias = (down * 2 + volatile) - up
  score += Math.min(bearBias * 4, 20)

  // High-risk keywords in brief text
  const highRiskWords = ['war', 'attack', 'sanction', 'crisis', 'crash', 'collapse', 'conflict', 'escalat']
  const briefLower = brief.brief.toLowerCase()
  const keywordHits = highRiskWords.filter((w) => briefLower.includes(w)).length
  score += keywordHits * 3

  return Math.max(5, Math.min(98, Math.round(score)))
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
      return NextResponse.json({ error: 'Market brief not yet generated' }, { status: 404 })
    }

    const score   = computeScore(brief)
    const level   = scoreToLevel(score)
    const meta    = LEVEL_META[level]

    const payload: MarketRiskPayload = {
      score,
      level,
      label:     meta.label,
      color:     meta.color,
      factors:   brief.risks.slice(0, 3),
      updatedAt: brief.generatedAt,
    }

    redis.set(RISK_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[api/market-risk]', err)
    return NextResponse.json({ error: 'Risk score unavailable' }, { status: 503 })
  }
}
