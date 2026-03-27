import { NextResponse } from 'next/server'
import { getClient } from '@/lib/api/groq'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(3600)

export interface TradeIdea {
  symbol: string
  direction: 'long' | 'short' | 'hedge'
  thesis: string
  catalyst: string
  risk: string
  timeframe: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 5)
  if (limited) return limited

  try {
    const data = await cachedFetch<{ ideas: TradeIdea[]; generatedAt: number }>(
      'trade-ideas:daily:v1',
      3600, // 1 hour cache
      async () => {
        const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketlens.live'
        const [moversRes, newsRes, riskRes] = await Promise.allSettled([
          fetch(`${base}/api/movers`).then(r => r.json()).catch(() => null),
          fetch(`${base}/api/news?page=1&limit=10`).then(r => r.json()).catch(() => null),
          fetch(`${base}/api/market-risk`).then(r => r.json()).catch(() => null),
        ])

        const movers = moversRes.status === 'fulfilled' ? moversRes.value : null
        const news = newsRes.status === 'fulfilled' ? newsRes.value : null
        const risk = riskRes.status === 'fulfilled' ? riskRes.value : null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topGainers = (movers?.gainers ?? []).slice(0, 5).map((m: any) => `${m.symbol} +${m.changePercent?.toFixed(1)}%`).join(', ')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topLosers = (movers?.losers ?? []).slice(0, 5).map((m: any) => `${m.symbol} ${m.changePercent?.toFixed(1)}%`).join(', ')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const headlines = (news?.articles ?? news ?? []).slice(0, 8).map((a: any) => a.headline || a.title).join(' | ')
        const riskLevel = risk?.overallRisk ?? risk?.level ?? 'unknown'

        const client = getClient()
        const completion = await client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 600,
          temperature: 0.4,
          messages: [{
            role: 'system',
            content: `You are a senior equity strategist at a top-tier hedge fund. Generate exactly 3 trade ideas based on today's market conditions. Be specific — name real tickers, give precise reasoning.

Respond ONLY with valid JSON array:
[
  {
    "symbol": "TICKER",
    "direction": "long" | "short" | "hedge",
    "thesis": "One sentence: why this trade works right now",
    "catalyst": "What specific event or trend drives this",
    "risk": "Primary risk to this trade",
    "timeframe": "1-3 days" | "1-2 weeks" | "1-3 months",
    "confidence": "HIGH" | "MEDIUM" | "LOW"
  }
]

Rules:
- One long, one short, one hedge/pair trade
- Only use major liquid US equities, ETFs, or commodities
- Reference today's actual movers and news
- Be contrarian when the crowd is extreme
- Confidence should reflect conviction, not certainty`,
          }, {
            role: 'user',
            content: `Today's market:
Top gainers: ${topGainers || 'data loading'}
Top losers: ${topLosers || 'data loading'}
Headlines: ${headlines || 'no headlines available'}
Market risk level: ${riskLevel}

Generate 3 trade ideas.`,
          }],
        })

        const text = completion.choices?.[0]?.message?.content ?? '[]'
        let ideas: TradeIdea[] = []
        try {
          const cleaned = text.replace(/```json|```/g, '').trim()
          ideas = JSON.parse(cleaned)
        } catch {
          ideas = []
        }

        return { ideas, generatedAt: Date.now() }
      },
    )

    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ ideas: [], generatedAt: Date.now() })
  }
}
