import { NextResponse }          from 'next/server'
import { createServerSupabase }   from '@/lib/supabase/server'
import { withRateLimit }          from '@/lib/utils/rate-limit'
import { getRelatedNewsForAsset } from '@/lib/api/rss'
import { redis }                  from '@/lib/cache/redis'
import { getClient }              from '@/lib/api/groq'

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioBriefPayload {
  // New structured fields
  overview?:   string
  movers?:     string
  risk_focus?: string
  action?:     string
  // Existing fields (kept for backward compat)
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

const SYSTEM_PROMPT = `You are a personal portfolio analyst at a top-tier wealth management firm. Given a trader's positions and recent news, write a structured briefing personalized to THEIR specific holdings.

Respond with valid JSON only — no markdown fences, no explanation:
{
  "overview": "<1-2 sentences. Quick snapshot: how many positions are positive/negative, what's leading. Reference specific symbols.>",
  "movers": "<2-3 sentences. What's moving in their portfolio and why. Reference specific symbols with direction. For shorts, price down = positive for them.>",
  "risk_focus": "<1-2 sentences. The single biggest risk to their portfolio right now. Be specific — name the position, the threat, and the price level or event.>",
  "action": "<1-2 sentences. Specific, actionable suggestion. Reference a position by symbol. Mention upcoming events (earnings dates, data releases) that affect their holdings.>",
  "alerts": [
    { "symbol": "AAPL", "type": "risk", "message": "<1 sentence — specific and actionable>" }
  ],
  "sentiment": "bullish",
  "brief": "<4-6 sentence summary tying it all together — fallback for old UI clients>"
}

Rules:
- Only reference symbols that are in the user's portfolio
- alerts should have 2-5 items, focused on the most impactful developments
- For short positions: rising prices are risks, falling prices are opportunities
- sentiment must be exactly one of: "bullish", "bearish", "mixed"
- Be opinionated and direct — don't hedge everything with "could" and "might"
- The action field should contain a genuine suggestion, not "monitor your positions"
- Lead with what changed, not a generic recap`

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check per-user cache (skipped when ?refresh=true)
  const url          = new URL(req.url)
  const forceRefresh = url.searchParams.get('refresh') === 'true'
  const cacheKey     = `portfolio:brief:${user.id}`

  if (!forceRefresh) {
    try {
      const cached = await redis.get<PortfolioBriefPayload>(cacheKey)
      if (cached) return NextResponse.json(cached)
    } catch { /* fall through */ }
  }

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
    const client     = getClient()
    const completion = await client.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature:     0.3,
      max_tokens:      1000,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(raw) } catch { parsed = {} }

    const payload: PortfolioBriefPayload = {
      overview:    typeof parsed.overview === 'string' ? parsed.overview : undefined,
      movers:      typeof parsed.movers === 'string' ? parsed.movers : undefined,
      risk_focus:  typeof parsed.risk_focus === 'string' ? parsed.risk_focus : undefined,
      action:      typeof parsed.action === 'string' ? parsed.action : undefined,
      brief:       typeof parsed.brief === 'string' ? parsed.brief : 'Portfolio analysis unavailable.',
      alerts:      Array.isArray(parsed.alerts) ? (parsed.alerts as PortfolioBriefPayload['alerts']).slice(0, 5) : [],
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

export async function DELETE(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cacheKey = `portfolio:brief:${user.id}`
  await redis.del(cacheKey).catch(() => {})
  return NextResponse.json({ success: true })
}
