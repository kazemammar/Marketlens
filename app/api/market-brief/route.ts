import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis } from '@/lib/cache/redis'
import Groq from 'groq-sdk'

const CACHE_KEY = 'market-brief:daily'
const CACHE_TTL = 1_800 // 30 minutes

interface AffectedAsset {
  symbol:    string
  type:      'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
  direction: 'up' | 'down' | 'volatile'
}

export interface MarketBriefPayload {
  brief:          string
  risks:          string[]
  opportunities:  string[]
  affectedAssets: AffectedAsset[]
  generatedAt:    number
}

const SYSTEM_PROMPT = `You are the chief market strategist at a top-tier global investment bank.
You write concise, actionable morning briefings for professional traders.

Respond with valid JSON only — no markdown fences, no explanation:
{
  "brief": "<4-6 sentence morning briefing. Be direct, specific, and mention real asset names and price directions. Cover: what is driving markets today, key geopolitical risks, and one clear actionable insight.>",
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "affectedAssets": [
    { "symbol": "GLD",     "type": "commodity", "direction": "up" },
    { "symbol": "USD/JPY", "type": "forex",     "direction": "down" }
  ]
}

Rules:
- affectedAssets must use exact symbols from this list: GLD, SLV, USO, GC=F, CL=F, BTC, ETH, SOL, EUR/USD, USD/JPY, GBP/USD, AAPL, NVDA, XOM, SPY, QQQ, TLT, VIX
- direction is "up", "down", or "volatile"
- Include 3-6 affected assets`

export async function GET() {
  // Check cache
  try {
    const cached = await redis.get<MarketBriefPayload>(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }
  } catch { /* fall through */ }

  // Fetch recent headlines (non-fatal — proceed with fallback if unavailable)
  let headlines: string[] = []
  try {
    const articles = await getFinanceNews()
    headlines = articles.slice(0, 20).map((a) => a.headline)
  } catch { /* proceed with empty headlines */ }

  if (headlines.length === 0) {
    const fallback: MarketBriefPayload = {
      brief:          'Market data feeds are temporarily unavailable. Key global markets continue to trade with activity driven by central bank policy expectations and macro developments. Monitor for breaking geopolitical and economic data releases.',
      risks:          ['Data feed disruption', 'Central bank policy uncertainty', 'Geopolitical escalation risk'],
      opportunities:  ['Defensive assets may offer near-term stability'],
      affectedAssets: [],
      generatedAt:    Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 300 }).catch(() => {})
    return NextResponse.json(fallback)
  }

  // Call Groq
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not set')

    const client = new Groq({ apiKey })
    const userMessage = `Today's headlines (${new Date().toUTCString()}):\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`

    const completion = await client.chat.completions.create({
      model:           'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature:     0.3,
      max_tokens:      600,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Partial<MarketBriefPayload>

    const payload: MarketBriefPayload = {
      brief:          typeof parsed.brief === 'string' ? parsed.brief : 'Market analysis unavailable.',
      risks:          Array.isArray(parsed.risks) ? parsed.risks.slice(0, 4) : [],
      opportunities:  Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 3) : [],
      affectedAssets: Array.isArray(parsed.affectedAssets) ? parsed.affectedAssets.slice(0, 6) : [],
      generatedAt:    Date.now(),
    }

    // Cache
    redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[api/market-brief]', err)
    const fallback: MarketBriefPayload = {
      brief:          'AI analysis is temporarily unavailable. Markets are trading on continued macro themes — watch Federal Reserve communications, energy supply dynamics, and geopolitical risk factors for directional cues.',
      risks:          ['AI service temporarily unavailable', 'Monitor for macro surprises', 'Geopolitical risk remains elevated'],
      opportunities:  ['Commodities and safe-haven assets may benefit from uncertainty'],
      affectedAssets: [
        { symbol: 'GLD',   type: 'commodity', direction: 'up' },
        { symbol: 'SPY',   type: 'etf',       direction: 'volatile' },
        { symbol: 'USD/JPY', type: 'forex',   direction: 'volatile' },
      ],
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 300 }).catch(() => {})
    return NextResponse.json(fallback)
  }
}
