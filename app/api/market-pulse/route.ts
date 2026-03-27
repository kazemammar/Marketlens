// GET /api/market-pulse
// The squawk box — a single punchy sentence about what's moving markets RIGHT NOW.
// Own Groq call (tiny: ~50 output tokens). 5-min Redis cache.
// Separate from the Brief because it needs to react to the LATEST headlines.

import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis }          from '@/lib/cache/redis'
import { groqChat }       from '@/lib/api/groq'
import { withRateLimit }  from '@/lib/utils/rate-limit'
import type { HomepageData } from '@/lib/api/homepage'
import { HOMEPAGE_CACHE_KEY } from '@/lib/api/homepage'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(60)

const CACHE_KEY = 'market-pulse:live'
const CACHE_TTL = 300 // 5 minutes

export interface PulseAsset {
  symbol:    string
  type:      'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
  direction: 'up' | 'down' | 'volatile'
}

export interface MarketPulsePayload {
  pulse:          string
  urgency:        'breaking' | 'alert' | 'normal'
  affectedAssets: PulseAsset[]
  generatedAt:    number
}

const SYSTEM_PROMPT = `You are a live markets squawk box on a trading floor. Based on the latest headlines and price snapshot, write ONE punchy sentence (max 30 words) about what is moving markets RIGHT NOW.

Respond with valid JSON only — no markdown:
{
  "pulse": "<one sentence, max 30 words. Must include specific numbers, levels, or percentages. Name the catalyst with 'as', 'after', or 'on'. Example: 'S&P 500 futures +0.8% as Fed pivot hopes grow after dovish Waller comments — Treasury yields slide'>",
  "urgency": "breaking" | "alert" | "normal",
  "affectedAssets": [
    { "symbol": "SPY", "type": "etf", "direction": "up" }
  ]
}

Urgency guide:
- "breaking": War escalation, market crash (>3% move), emergency rate decision, sovereign default, major terror attack — events that will move markets violently. Use VERY rarely.
- "alert": Fed commentary, surprise data miss/beat, major earnings, tariff announcements, oil spike/crash — notable moves that traders need to know about.
- "normal": Regular rotation, gradual trends, mixed session, consolidation. This is the default for most market days.

Rules:
- The pulse MUST contain at least one specific number ($85.40, +2.1%, 4,200 level)
- Name the WHY — don't just say "markets rally", say what's causing it
- Affected assets: 2-5, from: GLD, SLV, USO, GC=F, CL=F, BTC, ETH, SOL, EUR/USD, USD/JPY, GBP/USD, AAPL, MSFT, NVDA, GOOGL, META, TSLA, AMZN, XOM, JPM, SPY, QQQ, TLT, VIX, DXY
- When headlines are thin or markets are quiet, say so honestly — "Thin tape ahead of Friday NFP — SPY pinned at 5,200 as vol sellers dominate"
- Never be generic. "Markets are volatile" is useless. Be specific.
- Distinguish between ACTIONABLE events (earnings surprises, rate decisions, major data) and NOISE (minor analyst notes, routine press releases). Only pulse on what actually moves markets.
- If multiple stories compete, pick the one with the biggest price impact — not the loudest headline.
- NEVER use markdown formatting (no **, no *, no #, no backticks) — plain text only.`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  // Check cache
  try {
    const cached = await redis.get<MarketPulsePayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached, { headers: EDGE_HEADERS })
  } catch { /* fall through */ }

  // Fetch headlines
  let headlines: string[] = []
  try {
    const articles = await getFinanceNews()
    headlines = articles.slice(0, 10).map((a) => a.headline)
  } catch { /* proceed with fallback */ }

  if (headlines.length === 0) {
    const fallback: MarketPulsePayload = {
      pulse: 'Data feeds temporarily unavailable — monitoring for reconnection.',
      urgency: 'normal',
      affectedAssets: [],
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 60 }).catch(() => {})
    return NextResponse.json(fallback, { headers: EDGE_HEADERS })
  }

  // Fetch price snapshot for context
  let priceContext = ''
  try {
    const homepage = await redis.get<HomepageData>(HOMEPAGE_CACHE_KEY)
    if (homepage?.tickerQuotes) {
      const snaps: string[] = []
      const LABELS: Record<string, string> = {
        SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones',
        'BINANCE:BTCUSDT': 'Bitcoin', 'BINANCE:ETHUSDT': 'Ethereum',
      }
      for (const [sym, q] of Object.entries(homepage.tickerQuotes)) {
        const label = LABELS[sym] ?? sym
        if (q.price > 0) {
          const sign = q.changePercent >= 0 ? '+' : ''
          snaps.push(`${label}: ${q.price.toFixed(2)} (${sign}${q.changePercent.toFixed(2)}%)`)
        }
      }
      if (homepage.commodityStrip) {
        for (const c of homepage.commodityStrip.slice(0, 3)) {
          const sign = c.changePercent >= 0 ? '+' : ''
          snaps.push(`${c.name}: ${c.price.toFixed(2)} (${sign}${c.changePercent.toFixed(2)}%)`)
        }
      }
      if (snaps.length > 0) priceContext = `\nPrices: ${snaps.join(' | ')}`
    }
  } catch { /* non-fatal */ }

  try {
    const completion = await groqChat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `${new Date().toUTCString()}\nHeadlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}${priceContext}` },
      ],
      temperature:     0.3,
      max_tokens:      150,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(raw) } catch { parsed = {} }

    const strip = (s: string) => s.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1').replace(/`([^`]+)`/g, '$1')

    const payload: MarketPulsePayload = {
      pulse: typeof parsed.pulse === 'string' ? strip(parsed.pulse) : headlines[0],
      urgency: (['breaking', 'alert', 'normal'] as const).includes(parsed.urgency as 'normal')
        ? parsed.urgency as 'breaking' | 'alert' | 'normal'
        : 'normal',
      affectedAssets: Array.isArray(parsed.affectedAssets)
        ? (parsed.affectedAssets as PulseAsset[]).slice(0, 5)
        : [],
      generatedAt: Date.now(),
    }

    redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/market-pulse]', err)
    const fallback: MarketPulsePayload = {
      pulse: headlines[0] ?? 'Markets active — monitoring key levels.',
      urgency: 'normal',
      affectedAssets: [],
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 120 }).catch(() => {})
    return NextResponse.json(fallback, { headers: EDGE_HEADERS })
  }
}
