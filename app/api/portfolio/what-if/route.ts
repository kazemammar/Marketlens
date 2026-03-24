import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getClient } from '@/lib/api/groq'
import { redis } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'

export interface WhatIfResult {
  impact: 'positive' | 'negative' | 'mixed'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  positions: Array<{ symbol: string; impact: 'positive' | 'negative' | 'neutral'; reason: string }>
  hedges: string[]
  probability_note: string
}

export async function POST(req: Request) {
  const limited = withRateLimit(req, 5)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let body: { scenario?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const scenario = body.scenario?.trim()
  if (!scenario || scenario.length > 500) {
    return NextResponse.json({ error: 'Scenario required (max 500 chars)' }, { status: 400 })
  }

  // Check cache
  const cacheKey = `whatif:${user.id}:${scenario.toLowerCase().replace(/\s+/g, '-').slice(0, 80)}`
  try {
    const cached = await redis.get<WhatIfResult>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch portfolio positions
  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type, direction, quantity, avg_cost')
    .eq('user_id', user.id)

  if (!positions || positions.length === 0) {
    return NextResponse.json({ error: 'No positions found' }, { status: 400 })
  }

  const positionList = positions.map(p =>
    `${p.symbol} (${p.asset_type}, ${p.direction}${p.quantity ? `, qty: ${p.quantity}` : ''}${p.avg_cost ? `, avg: $${p.avg_cost}` : ''})`
  ).join('\n')

  try {
    const client = getClient()
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a senior risk analyst at a multi-strategy hedge fund. A trader asks: "What happens to my portfolio if ${scenario}?"

Their positions:
${positionList}

Respond with valid JSON only:
{
  "impact": "positive" | "negative" | "mixed",
  "severity": "HIGH" | "MEDIUM" | "LOW",
  "summary": "<2-3 sentence executive summary of overall portfolio impact>",
  "positions": [
    { "symbol": "AAPL", "impact": "positive" | "negative" | "neutral", "reason": "<1 sentence explaining how this specific position is affected>" }
  ],
  "hedges": ["<1 sentence suggesting a hedge or protective action>"],
  "probability_note": "<1 sentence on how likely this scenario is based on current conditions>"
}

Rules:
- Only reference symbols in the portfolio
- Be specific about WHY each position is affected (supply chain, revenue exposure, etc.)
- hedges should suggest actionable trades (e.g., "Buy GLD as geopolitical hedge")
- For short positions, price drops are positive for the trader`
        },
        { role: 'user', content: `What if ${scenario}?` },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as WhatIfResult

    const result: WhatIfResult = {
      impact: ['positive', 'negative', 'mixed'].includes(parsed.impact) ? parsed.impact : 'mixed',
      severity: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.severity) ? parsed.severity : 'MEDIUM',
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis unavailable.',
      positions: Array.isArray(parsed.positions) ? parsed.positions.slice(0, 20) : [],
      hedges: Array.isArray(parsed.hedges) ? parsed.hedges.slice(0, 3) : [],
      probability_note: typeof parsed.probability_note === 'string' ? parsed.probability_note : '',
    }

    redis.set(cacheKey, result, { ex: 900 }).catch(() => {})
    return NextResponse.json(result)
  } catch (err) {
    console.error('[what-if]', err)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}
