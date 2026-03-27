// GET /api/earnings-preview
// AI-generated earnings previews for upcoming reports (next 7 days).
// Picks the top 5 most notable upcoming earnings, generates bull/base/bear
// scenarios + key metrics to watch. One Groq call, 12h Redis cache.

import { NextResponse } from 'next/server'
import { groqChat } from '@/lib/api/groq'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import { getEarningsCalendar, type EarningsEvent } from '@/lib/api/finnhub'
import { getFinanceNews } from '@/lib/api/rss'

const EDGE_HEADERS = cacheHeaders(3600)

export interface EarningsScenario {
  case: 'bull' | 'base' | 'bear'
  eps: string
  revenue: string
  driver: string
  stockReaction: string
}

export interface EarningsPreviewItem {
  symbol: string
  date: string
  hour: string
  epsEstimate: number | null
  revenueEstimate: number | null
  quarter: number
  year: number
  keyMetric: string
  whyItMatters: string
  scenarios: EarningsScenario[]
  risks: string
}

export interface EarningsPreviewPayload {
  previews: EarningsPreviewItem[]
  generatedAt: number
}

// Notable tickers that users care about — filter for these when possible
const NOTABLE_TICKERS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA',
  'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'SQ', 'SHOP',
  'JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'V', 'MA',
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY',
  'XOM', 'CVX', 'COP', 'SLB', 'HAL',
  'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
  'BA', 'CAT', 'DE', 'GE', 'HON', 'UPS', 'FDX',
  'WMT', 'COST', 'TGT', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD',
  'COIN', 'MSTR', 'PLTR', 'SNOW', 'UBER', 'ABNB', 'DASH',
  'AI', 'SMCI', 'ARM', 'AVGO', 'QCOM', 'MU', 'LRCX', 'AMAT',
])

function pickTopEarnings(events: EarningsEvent[], maxCount: number): EarningsEvent[] {
  // Prioritize notable tickers, then by those with estimates available
  const notable = events.filter(e => NOTABLE_TICKERS.has(e.symbol))
  const rest = events.filter(e => !NOTABLE_TICKERS.has(e.symbol) && e.epsEstimate !== null)

  const picked = [...notable, ...rest].slice(0, maxCount)
  // Sort by date
  picked.sort((a, b) => a.date.localeCompare(b.date))
  return picked
}

const SYSTEM_PROMPT = `You are a senior equity research analyst at a top-tier investment bank. Generate earnings preview notes for upcoming quarterly reports.

For each company, provide a concise pre-earnings analysis that a trader can scan in 10 seconds.

Respond with valid JSON only — no markdown formatting (no **, no *, no backticks):
{
  "previews": [
    {
      "symbol": "TICKER",
      "keyMetric": "The ONE metric that will determine the stock reaction (e.g., 'Data center revenue' for NVDA, 'iPhone units' for AAPL, 'AWS growth' for AMZN)",
      "whyItMatters": "1 sentence: why this earnings report matters for the broader market or sector",
      "scenarios": [
        { "case": "bull", "eps": "$X.XX", "revenue": "$X.XB", "driver": "What goes right in 1 sentence", "stockReaction": "+X-Y%" },
        { "case": "base", "eps": "$X.XX", "revenue": "$X.XB", "driver": "Consensus scenario in 1 sentence", "stockReaction": "flat to +/-X%" },
        { "case": "bear", "eps": "$X.XX", "revenue": "$X.XB", "driver": "What goes wrong in 1 sentence", "stockReaction": "-X-Y%" }
      ],
      "risks": "1 sentence: the non-obvious risk everyone is underestimating"
    }
  ]
}

Rules:
- keyMetric must be the SPECIFIC operating metric that matters most, not just "EPS" or "revenue"
- scenarios must have specific dollar amounts and percentage reactions
- stockReaction should reflect historical earnings move patterns for that stock
- whyItMatters should connect to the broader market narrative
- risks should be contrarian — what the consensus is missing
- Be specific and opinionated — generic previews are useless
- NEVER use markdown formatting — plain text only`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  try {
    const data = await cachedFetch<EarningsPreviewPayload>(
      'earnings-preview:v1',
      43200, // 12h cache
      async () => {
        // Get earnings for the next 7 days
        const now = new Date()
        const from = now.toISOString().slice(0, 10)
        const nextWeek = new Date(now)
        nextWeek.setDate(now.getDate() + 7)
        const to = nextWeek.toISOString().slice(0, 10)

        const allEvents = await getEarningsCalendar(from, to)
        // Only include events that haven't reported yet
        const upcoming = allEvents.filter(e => e.epsActual === null)
        const topEvents = pickTopEarnings(upcoming, 5)

        if (topEvents.length === 0) {
          return { previews: [], generatedAt: Date.now() }
        }

        // Get recent headlines for market context
        let headlines: string[] = []
        try {
          const articles = await getFinanceNews()
          headlines = articles.slice(0, 10).map(a => a.headline)
        } catch { /* non-fatal */ }

        const earningsContext = topEvents.map(e => {
          const parts = [`${e.symbol}: reports ${e.date} ${e.hour === 'bmo' ? 'before market open' : e.hour === 'amc' ? 'after close' : ''} Q${e.quarter} FY${e.year}`]
          if (e.epsEstimate !== null) parts.push(`EPS est: $${e.epsEstimate.toFixed(2)}`)
          if (e.revenueEstimate !== null) parts.push(`Rev est: $${(e.revenueEstimate / 1e9).toFixed(2)}B`)
          return parts.join(' | ')
        }).join('\n')

        const userMessage = `Upcoming earnings to preview:\n${earningsContext}\n\nMarket context headlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\nGenerate earnings previews for these ${topEvents.length} companies.`

        const completion = await groqChat({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 1200,
          response_format: { type: 'json_object' },
        })

        const raw = completion.choices[0]?.message?.content ?? '{}'
        let parsed: { previews?: Array<Record<string, unknown>> }
        try { parsed = JSON.parse(raw) } catch { parsed = {} }

        const strip = (s: string) => s.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').replace(/`([^`]+)`/g, '$1')

        const previews: EarningsPreviewItem[] = (parsed.previews ?? [])
          .slice(0, 5)
          .map((p, i) => {
            const event = topEvents.find(e => e.symbol === p.symbol) ?? topEvents[i]
            if (!event) return null

            return {
              symbol: event.symbol,
              date: event.date,
              hour: event.hour,
              epsEstimate: event.epsEstimate,
              revenueEstimate: event.revenueEstimate,
              quarter: event.quarter,
              year: event.year,
              keyMetric: typeof p.keyMetric === 'string' ? strip(p.keyMetric) : 'Key operating metrics',
              whyItMatters: typeof p.whyItMatters === 'string' ? strip(p.whyItMatters) : '',
              scenarios: Array.isArray(p.scenarios)
                ? (p.scenarios as EarningsScenario[]).slice(0, 3).map(s => ({
                    case: s.case,
                    eps: typeof s.eps === 'string' ? s.eps : '—',
                    revenue: typeof s.revenue === 'string' ? s.revenue : '—',
                    driver: typeof s.driver === 'string' ? strip(s.driver) : '',
                    stockReaction: typeof s.stockReaction === 'string' ? s.stockReaction : '—',
                  }))
                : [],
              risks: typeof p.risks === 'string' ? strip(p.risks) : '',
            }
          })
          .filter((p): p is EarningsPreviewItem => p !== null)

        return { previews, generatedAt: Date.now() }
      },
    )

    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/earnings-preview]', err)
    return NextResponse.json({ previews: [], generatedAt: Date.now() }, { headers: EDGE_HEADERS })
  }
}
