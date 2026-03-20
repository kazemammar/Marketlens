import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis } from '@/lib/cache/redis'
import Groq from 'groq-sdk'
import { withRateLimit } from '@/lib/utils/rate-limit'

const CACHE_KEY = 'market-brief:daily'
const CACHE_TTL = 3600 // 60 minutes — hourly brief
const RISK_KEY  = 'market-risk:v6'

const BREAKING_KEYWORDS = [
  'war', 'attack', 'missile', 'explosion', 'sanction', 'crash',
  'collapse', 'emergency', 'assassination', 'invasion', 'default',
]

export interface AffectedAsset {
  symbol:    string
  type:      'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
  direction: 'up' | 'down' | 'volatile'
}

export interface MarketBriefPayload {
  // New structured fields
  overnight?:     string
  macro?:         string
  sectors?:       string
  watchlist?:     Array<{ symbol: string; type: string; direction: 'up' | 'down' | 'volatile'; reason: string }>
  // Existing fields (kept for backward compat)
  brief:          string
  risks:          string[]
  opportunities:  string[]
  affectedAssets: AffectedAsset[]
  generatedAt:    number
}

const SYSTEM_PROMPT = `You are the chief market strategist at a top-tier global investment bank. You write structured, opinionated morning notes for professional traders. You don't just summarize — you take directional views.

Respond with valid JSON only — no markdown fences, no explanation:
{
  "overnight": "<1-2 sentences. What happened in Asia and Europe while US was closed. Include specific index moves with numbers (e.g. Nikkei +1.2%). If nothing notable, say so briefly.>",
  "macro": "<1-2 sentences. The single most important macro theme today. Mention specific data releases with times if relevant (e.g. CPI at 8:30 ET). Be specific about what the market expects and what would be a surprise.>",
  "sectors": "<1-2 sentences. Which sectors are leading and lagging, and why. Name specific sectors and catalysts.>",
  "watchlist": [
    { "symbol": "CL=F", "type": "commodity", "direction": "up", "reason": "<1 sentence: specific price level, catalyst, or setup>" }
  ],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "brief": "<4-6 sentence summary tying it all together — this is the fallback for old UI clients>"
}

Rules:
- watchlist must have 3-5 items with specific, actionable reasons — not generic commentary
- watchlist symbols must use exact symbols from: GLD, SLV, USO, GC=F, CL=F, BTC, ETH, SOL, EUR/USD, USD/JPY, GBP/USD, AAPL, MSFT, NVDA, GOOGL, META, TSLA, AMZN, XOM, JPM, SPY, QQQ, TLT, VIX
- direction is "up", "down", or "volatile"
- Be opinionated — morning notes that just summarize news without a view are useless
- Lead with what matters most, not a chronological recap
- Keep each section tight — traders scan in 10 seconds`

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

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
      max_tokens:      900,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const payload: MarketBriefPayload = {
      overnight:      typeof parsed.overnight === 'string' ? parsed.overnight : undefined,
      macro:          typeof parsed.macro === 'string' ? parsed.macro : undefined,
      sectors:        typeof parsed.sectors === 'string' ? parsed.sectors : undefined,
      watchlist:      Array.isArray(parsed.watchlist) ? (parsed.watchlist as Array<{ symbol: string; type: string; direction: 'up' | 'down' | 'volatile'; reason: string }>).slice(0, 5) : undefined,
      brief:          typeof parsed.brief === 'string' ? parsed.brief : 'Market analysis unavailable.',
      risks:          Array.isArray(parsed.risks) ? (parsed.risks as string[]).slice(0, 4) : [],
      opportunities:  Array.isArray(parsed.opportunities) ? (parsed.opportunities as string[]).slice(0, 3) : [],
      affectedAssets: Array.isArray(parsed.watchlist)
        ? (parsed.watchlist as Array<{ symbol: string; type: string; direction: string }>).slice(0, 6).map((w) => ({
            symbol: w.symbol, type: w.type as AffectedAsset['type'], direction: w.direction as AffectedAsset['direction'],
          }))
        : (Array.isArray(parsed.affectedAssets) ? (parsed.affectedAssets as AffectedAsset[]).slice(0, 6) : []),
      generatedAt:    Date.now(),
    }

    // ── Breaking-news detection: read old brief BEFORE overwriting ──
    let prevBrief: MarketBriefPayload | null = null
    try {
      prevBrief = await redis.get<MarketBriefPayload>(CACHE_KEY)
    } catch { /* non-fatal */ }

    // Cache new brief
    redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})

    // Bust risk cache if a new breaking keyword appeared
    if (prevBrief) {
      const prevCorpus = (prevBrief.brief + ' ' + prevBrief.risks.join(' ')).toLowerCase()
      const newCorpus  = (payload.brief  + ' ' + payload.risks.join(' ')).toLowerCase()
      const hasNewBreaking = BREAKING_KEYWORDS.some(
        (kw) => newCorpus.includes(kw) && !prevCorpus.includes(kw)
      )
      if (hasNewBreaking) {
        redis.del(RISK_KEY).catch(() => {})
        console.log('[market-brief] Breaking keyword detected — risk cache invalidated')
      }
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[api/market-brief]', err)
    const fallback: MarketBriefPayload = {
      brief:          'AI analysis is temporarily unavailable. Markets are trading on continued macro themes — watch Federal Reserve communications, energy supply dynamics, and geopolitical risk factors for directional cues.',
      risks:          ['AI service temporarily unavailable', 'Monitor for macro surprises', 'Geopolitical risk remains elevated'],
      opportunities:  ['Commodities and safe-haven assets may benefit from uncertainty'],
      affectedAssets: [
        { symbol: 'GLD',     type: 'commodity', direction: 'up' },
        { symbol: 'SPY',     type: 'etf',       direction: 'volatile' },
        { symbol: 'USD/JPY', type: 'forex',     direction: 'volatile' },
      ],
      generatedAt: Date.now(),
    }
    redis.set(CACHE_KEY, fallback, { ex: 300 }).catch(() => {})
    return NextResponse.json(fallback)
  }
}
