import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis }          from '@/lib/cache/redis'
import Groq               from 'groq-sdk'
import { withRateLimit }  from '@/lib/utils/rate-limit'

const CACHE_KEY = 'market-pulse:live'
const CACHE_TTL = 300 // 5 minutes

export interface PulseAsset {
  symbol:    string
  type:      'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
  direction: 'up' | 'down' | 'volatile'
}

export interface MarketPulsePayload {
  pulse:          string        // 1-2 sentence live take
  affectedAssets: PulseAsset[]  // up to 5 asset chips
  generatedAt:    number
}

const SYSTEM_PROMPT = `You are a live markets desk analyst. Based on today's headlines, write ONE punchy sentence (max 25 words) capturing what is moving markets RIGHT NOW. Then identify up to 5 specific assets being moved by this news.

Respond with valid JSON only — no markdown:
{
  "pulse": "<one sentence, max 25 words, specific and direct — name assets, levels, events>",
  "affectedAssets": [
    { "symbol": "CL=F", "type": "commodity", "direction": "up" }
  ]
}

Rules:
- pulse must be specific — no generic "markets are volatile" statements
- affectedAssets symbols must be from: GLD, SLV, USO, GC=F, CL=F, BTC, ETH, SOL, EUR/USD, USD/JPY, GBP/USD, AAPL, MSFT, NVDA, GOOGL, META, TSLA, AMZN, XOM, JPM, SPY, QQQ, TLT, VIX
- direction is "up", "down", or "volatile"
- max 5 assets, min 2`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  try {
    const cached = await redis.get<MarketPulsePayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  let headlines: string[] = []
  try {
    const articles = await getFinanceNews()
    headlines = articles.slice(0, 8).map((a) => a.headline)
  } catch { /* proceed with fallback */ }

  if (headlines.length === 0) {
    const fallback: MarketPulsePayload = {
      pulse:          'Markets trading cautiously as data feeds are temporarily unavailable.',
      affectedAssets: [],
      generatedAt:    Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 60 }).catch(() => {})
    return NextResponse.json(fallback)
  }

  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY not set')

    const client      = new Groq({ apiKey })
    const userMessage = `Headlines (${new Date().toUTCString()}):\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`

    const completion = await client.chat.completions.create({
      model:           'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
      temperature:     0.4,
      max_tokens:      200,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const payload: MarketPulsePayload = {
      pulse:          typeof parsed.pulse === 'string' ? parsed.pulse : headlines[0],
      affectedAssets: Array.isArray(parsed.affectedAssets)
        ? (parsed.affectedAssets as PulseAsset[]).slice(0, 5)
        : [],
      generatedAt:    Date.now(),
    }

    redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)

  } catch (err) {
    console.error('[api/market-pulse]', err)
    const fallback: MarketPulsePayload = {
      pulse:          headlines[0] ?? 'Markets active — monitor key levels and data releases.',
      affectedAssets: [],
      generatedAt:    Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 120 }).catch(() => {})
    return NextResponse.json(fallback)
  }
}
