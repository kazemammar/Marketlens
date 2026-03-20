import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis }          from '@/lib/cache/redis'
import Groq               from 'groq-sdk'
import { withRateLimit }  from '@/lib/utils/rate-limit'

const CACHE_KEY = 'market-pulse:live'
const CACHE_TTL = 300 // 5 minutes

export interface MarketPulsePayload {
  pulse:       string          // 1-2 sentence live take
  headlines:   string[]        // top 4 raw headlines
  generatedAt: number
}

const SYSTEM_PROMPT = `You are a live markets desk analyst monitoring breaking news. Write one punchy, direct sentence (max 25 words) capturing what is MOVING markets RIGHT NOW based on today's headlines. No preamble, no "the market", just the key driver. Be specific — name assets, levels, events.

Respond with valid JSON only:
{ "pulse": "<one sentence, max 25 words, specific and direct>" }`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  // Check cache
  try {
    const cached = await redis.get<MarketPulsePayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch headlines
  let headlines: string[] = []
  try {
    const articles = await getFinanceNews()
    headlines = articles.slice(0, 8).map((a) => a.headline)
  } catch { /* proceed with fallback */ }

  if (headlines.length === 0) {
    const fallback: MarketPulsePayload = {
      pulse:       'Markets trading cautiously as data feeds are temporarily unavailable.',
      headlines:   [],
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 60 }).catch(() => {})
    return NextResponse.json(fallback)
  }

  // Call Groq
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
      max_tokens:      80,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const payload: MarketPulsePayload = {
      pulse:       typeof parsed.pulse === 'string' ? parsed.pulse : headlines[0],
      headlines:   headlines.slice(0, 4),
      generatedAt: Date.now(),
    }

    redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)

  } catch (err) {
    console.error('[api/market-pulse]', err)
    const fallback: MarketPulsePayload = {
      pulse:       headlines[0] ?? 'Markets active — monitor key levels and data releases.',
      headlines:   headlines.slice(0, 4),
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 120 }).catch(() => {})
    return NextResponse.json(fallback)
  }
}
