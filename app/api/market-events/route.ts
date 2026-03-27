import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { groqChat } from '@/lib/api/groq'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(1800)

export interface MarketEvent {
  date:     string
  title:    string
  category: 'rates' | 'trade' | 'geopolitical' | 'tech' | 'macro' | 'fx' | 'political' | 'earnings'
  impact:   'positive' | 'negative' | 'neutral'
  detail:   string
}

export interface MarketEventsPayload {
  events:      MarketEvent[]
  generatedAt: number
}

const SYSTEM_PROMPT = `You are a senior market historian and strategist. Given today's date and recent news headlines, produce a timeline of the most significant market-moving events from the past 12 months.

Respond with valid JSON only — no markdown fences:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "title": "<short headline, max 8 words>",
      "category": "rates" | "trade" | "geopolitical" | "tech" | "macro" | "fx" | "political" | "earnings",
      "impact": "positive" | "negative" | "neutral",
      "detail": "<1-2 sentences explaining market impact with specific numbers: index moves, price levels, percentage changes>"
    }
  ]
}

Rules:
- Include 10-14 events, chronologically ordered (oldest first)
- Only include events that ACTUALLY HAPPENED — do not fabricate or speculate
- Focus on events that moved markets significantly: Fed decisions, major selloffs/rallies, geopolitical shocks, trade policy changes, tech disruptions, major earnings surprises
- Each event must have a specific date (use approximate if unsure of exact day)
- detail must include SPECIFIC market reactions: "S&P 500 dropped 4.8%" not "markets fell"
- Categories: rates (central bank), trade (tariffs/trade deals), geopolitical (wars/tensions), tech (AI/sector), macro (GDP/jobs/CPI), fx (currency), political (elections/policy), earnings (major earnings moves)
- impact: positive = markets rallied, negative = markets sold off, neutral = mixed/flat
- Be concise — traders scan quickly`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 5)
  if (limited) return limited

  try {
    const data = await cachedFetch<MarketEventsPayload>(
      'market-events:v1',
      86400, // 24h cache
      async () => {
        // Fetch recent headlines for context
        let headlines: string[] = []
        try {
          const articles = await getFinanceNews()
          headlines = articles.slice(0, 15).map((a) => a.headline)
        } catch { /* proceed without */ }

        const today = new Date().toISOString().slice(0, 10)
        const userMessage = `Today is ${today}. Recent headlines for context:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nGenerate the timeline of major market events from the past 12 months (${new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10)} to ${today}).`

        const completion = await groqChat({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userMessage },
          ],
          temperature:     0.2,
          max_tokens:      2000,
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content ?? '{}'
        let parsed: { events?: MarketEvent[] }
        try { parsed = JSON.parse(raw) } catch { parsed = {} }

        const events = Array.isArray(parsed.events)
          ? parsed.events
              .filter((e): e is MarketEvent =>
                typeof e.date === 'string' &&
                typeof e.title === 'string' &&
                typeof e.category === 'string' &&
                typeof e.impact === 'string' &&
                typeof e.detail === 'string'
              )
              .sort((a, b) => a.date.localeCompare(b.date))
          : []

        return { events, generatedAt: Date.now() }
      },
    )

    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/market-events]', err instanceof Error ? err.message : err)
    return NextResponse.json({ events: [], generatedAt: Date.now() }, { headers: EDGE_HEADERS })
  }
}
