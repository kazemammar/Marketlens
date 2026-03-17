import { NextResponse }          from 'next/server'
import { createServerSupabase }   from '@/lib/supabase/server'
import { withRateLimit }          from '@/lib/utils/rate-limit'
import { getRelatedNewsForAsset } from '@/lib/api/rss'
import { redis }                  from '@/lib/cache/redis'
import Groq                       from 'groq-sdk'

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioBriefPayload {
  brief:       string
  alerts:      Array<{ symbol: string; type: 'risk' | 'opportunity'; message: string }>
  sentiment:   'bullish' | 'bearish' | 'mixed'
  generatedAt: number
}

interface PositionRow {
  symbol:     string
  asset_type: string
  direction:  'long' | 'short'
}

// ─── Prompt ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a personal portfolio analyst. Given a trader's positions and recent news, write a personalized briefing about what's affecting THEIR specific holdings right now.

Respond with valid JSON only — no markdown fences, no explanation:
{
  "brief": "<4-6 sentences. Reference specific positions by symbol. Mention what's moving for or against them based on their direction (long/short). Be direct and actionable.>",
  "alerts": [
    { "symbol": "AAPL", "type": "risk", "message": "<1 sentence>" }
  ],
  "sentiment": "bullish"
}

Rules:
- Only reference symbols that are in the user's portfolio
- alerts should have 2-5 items, focused on the most impactful developments
- For short positions, rising prices are risks; for long positions, falling prices are risks
- sentiment reflects the overall outlook for the user's portfolio specifically
- sentiment must be exactly one of: "bullish", "bearish", "mixed"`

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check per-user cache
  const cacheKey = `portfolio:brief:${user.id}`
  try {
    const cached = await redis.get<PortfolioBriefPayload>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch positions
  const { data: positions, error } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type, direction')
    .eq('user_id', user.id)

  if (error || !positions || positions.length === 0) {
    const empty: PortfolioBriefPayload = {
      brief:       'Add positions to your portfolio to receive a personalized AI briefing on your holdings.',
      alerts:      [],
      sentiment:   'mixed',
      generatedAt: Date.now(),
    }
    return NextResponse.json(empty)
  }

  const rows = positions as PositionRow[]

  // Fetch headlines for each position (max 5 per, capped at 30 total)
  const newsResults = await Promise.allSettled(
    rows.map((p) => getRelatedNewsForAsset(p.symbol, p.asset_type))
  )

  // Build user prompt
  const positionList = rows
    .map((p) => `- ${p.symbol} (${p.asset_type}, ${p.direction.toUpperCase()})`)
    .join('\n')

  const headlineBlocks: string[] = []
  let totalHeadlines = 0

  newsResults.forEach((result, idx) => {
    if (result.status !== 'fulfilled' || result.value.length === 0) return
    if (totalHeadlines >= 30) return
    const pos = rows[idx]
    const headlines = result.value.slice(0, 5)
    headlineBlocks.push(
      `${pos.symbol}:\n${headlines.map((a, i) => `${i + 1}. ${a.headline}`).join('\n')}`
    )
    totalHeadlines += headlines.length
  })

  const userMessage = `My Portfolio:\n${positionList}\n\nRecent Headlines:\n${headlineBlocks.join('\n\n') || 'No recent headlines found for your positions.'}`

  // Call Groq
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not set')

    const client     = new Groq({ apiKey })
    const completion = await client.chat.completions.create({
      model:           'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature:     0.3,
      max_tokens:      800,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Partial<PortfolioBriefPayload>

    const payload: PortfolioBriefPayload = {
      brief:       typeof parsed.brief === 'string' ? parsed.brief : 'Portfolio analysis unavailable.',
      alerts:      Array.isArray(parsed.alerts) ? parsed.alerts.slice(0, 5) : [],
      sentiment:   (['bullish', 'bearish', 'mixed'] as const).includes(parsed.sentiment as 'bullish' | 'bearish' | 'mixed')
                     ? (parsed.sentiment as 'bullish' | 'bearish' | 'mixed')
                     : 'mixed',
      generatedAt: Date.now(),
    }

    redis.set(cacheKey, payload, { ex: 900 }).catch(() => {})
    return NextResponse.json(payload)

  } catch (err) {
    console.error('[api/portfolio/brief]', err)
    const fallback: PortfolioBriefPayload = {
      brief:       'AI analysis is temporarily unavailable. Monitor your positions for key macro developments and earnings releases that may affect your holdings.',
      alerts:      [],
      sentiment:   'mixed',
      generatedAt: Date.now(),
    }
    redis.set(cacheKey, fallback, { ex: 300 }).catch(() => {})
    return NextResponse.json(fallback)
  }
}
