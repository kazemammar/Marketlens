import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis } from '@/lib/cache/redis'
import { groqChat } from '@/lib/api/groq'
import { withRateLimit } from '@/lib/utils/rate-limit'
import type { HomepageData } from '@/lib/api/homepage'
import { HOMEPAGE_CACHE_KEY } from '@/lib/api/homepage'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(300)

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

export type MarketSession = 'pre_market' | 'morning' | 'afternoon' | 'after_hours'

export interface MarketBriefPayload {
  // v2 narrative fields
  narrative?:       string
  delta?:           string[]
  session?:         MarketSession
  session_context?: string
  looking_ahead?:   string
  confidence?:      'high' | 'medium' | 'low'
  // Structured fields
  overnight?:     string
  macro?:         string
  sectors?:       string
  watchlist?:     Array<{ symbol: string; type: string; direction: 'up' | 'down' | 'volatile'; reason: string }>
  // Existing fields (kept for backward compat — risk scoring depends on these)
  brief:          string
  risks:          string[]
  opportunities:  string[]
  affectedAssets: AffectedAsset[]
  generatedAt:    number
  headlineCount?: number
  sourceCount?:   number
}

// ─── Session detection ──────────────────────────────────────────────────

function getMarketSession(): { session: MarketSession; label: string; hour: number; minute: number } {
  const now = new Date()
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })
  const [h, m] = etStr.split(':').map(Number)
  const decimal = h + m / 60

  if (decimal < 9.5)  return { session: 'pre_market',   label: 'PRE-MKT',    hour: h, minute: m }
  if (decimal < 12)   return { session: 'morning',      label: 'MORNING',    hour: h, minute: m }
  if (decimal < 16)   return { session: 'afternoon',    label: 'AFTERNOON',  hour: h, minute: m }
  return                       { session: 'after_hours', label: 'AFTER HRS',  hour: h, minute: m }
}

function sessionInstructions(session: MarketSession): string {
  switch (session) {
    case 'pre_market':
      return 'Focus on: what happened overnight in Asia/Europe, what is scheduled today (data releases, earnings, Fed speakers), and how futures are positioned. This sets the frame for the trading day.'
    case 'morning':
      return 'Focus on: how markets reacted to the open, any data releases that just dropped, early sector leadership/rotation, and whether the overnight thesis is holding or breaking.'
    case 'afternoon':
      return 'Focus on: how the narrative shifted since the open, any mid-day reversals or sector rotation, whether volume confirms the move, and what the close might look like.'
    case 'after_hours':
      return 'Focus on: the day\'s final verdict, what worked and what didn\'t, after-hours earnings movers, and the setup for tomorrow. Be forward-looking.'
  }
}

// ─── Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(session: MarketSession, etTime: string, prevBrief: MarketBriefPayload | null): string {
  const sessionGuide = sessionInstructions(session)
  const prevContext = prevBrief?.narrative
    ? `\nYour previous note (${Math.round((Date.now() - prevBrief.generatedAt) / 60_000)}m ago) said:\n- Narrative: "${prevBrief.narrative}"\n- Key risks: ${(prevBrief.risks ?? []).slice(0, 2).join('; ')}\n- Watchlist: ${(prevBrief.watchlist ?? []).map(w => `${w.symbol} ${w.direction}`).join(', ')}\n\nCompare with current headlines and identify WHAT CHANGED. If nothing material changed, say so.`
    : ''

  return `You are the chief market strategist at a top-tier global investment bank. You write the session intelligence note for the trading desk. Your voice is authoritative, opinionated, and concise — like a Goldman Sachs morning note.

Current time: ${etTime} ET (${session.replace('_', '-')} session)
${sessionGuide}
${prevContext}

Respond with valid JSON only — no markdown fences:
{
  "narrative": "<ONE sentence, max 25 words. The dominant market theme RIGHT NOW. Be specific and opinionated. This is the HEADLINE — it must capture the single most important thing happening. Examples: 'Rate cut bets collapse as hot CPI rewrites the Fed playbook' or 'AI capex surge lifts semis as defensive rotation accelerates'>",

  "delta": ["<What changed since the last brief — 2-3 bullet points, each 1 sentence. If this is the first brief of the session or nothing material changed, include 'Opening brief — establishing baseline.' Be specific: 'Gold reversed from session highs' not 'Gold changed direction'>"],

  "session_context": "<1 sentence setting the scene for this specific time of day>",

  "overnight": "<1-2 sentences. Asia/Europe session recap with specific moves (Nikkei +1.2%, DAX flat). If US markets are open, summarize the session so far instead.>",
  "macro": "<Key macro theme + any scheduled data releases with exact times. Be specific: 'CPI at 8:30 ET — consensus +0.2% m/m' not just 'inflation data coming'>",
  "sectors": "<1-2 sentences. Leading and lagging sectors with specific catalysts. Name tickers.>",

  "watchlist": [
    { "symbol": "CL=F", "type": "commodity", "direction": "up", "reason": "<specific: price level, catalyst, or setup — not 'positive momentum'>" }
  ],

  "risks": ["<risk 1 — be specific and actionable, not generic 'geopolitical risk'>", "<risk 2>", "<risk 3>"],
  "opportunities": ["<opportunity with specific entry logic>", "<opportunity 2>"],

  "looking_ahead": "<1-2 sentences. What to watch in the NEXT 12-24 hours. Specific events with times if known. This should make the reader want to come back.>",

  "confidence": "high" | "medium" | "low",

  "brief": "<4-6 sentence comprehensive summary tying everything together — backward compat fallback>"
}

Rules:
- narrative is the MOST IMPORTANT field — it must be bold, specific, and opinionated
- delta compares against the previous brief if one exists — if nothing changed, say "No material shift"
- watchlist: 3-5 items with SPECIFIC reasons. Symbols from: GLD, SLV, USO, GC=F, CL=F, BTC, ETH, SOL, EUR/USD, USD/JPY, GBP/USD, AAPL, MSFT, NVDA, GOOGL, META, TSLA, AMZN, XOM, JPM, SPY, QQQ, TLT, VIX
- direction: "up", "down", or "volatile"
- confidence: "low" if <5 headlines, "medium" for 5-12, "high" for 12+
- looking_ahead must reference SPECIFIC upcoming events (earnings, data releases, Fed speakers)
- Be opinionated — notes without a directional view are useless
- Traders scan in 10 seconds — lead with what matters most`
}

// ─── Route handler ──────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  const url = new URL(req.url)
  const forceRefresh = url.searchParams.get('refresh') === 'true'

  // Check cache (skip if force refresh)
  if (!forceRefresh) {
    try {
      const cached = await redis.get<MarketBriefPayload>(CACHE_KEY)
      if (cached) {
        return NextResponse.json(cached, { headers: EDGE_HEADERS })
      }
    } catch { /* fall through */ }
  }

  // Fetch recent headlines (non-fatal)
  let headlines: string[] = []
  let sourceSet = new Set<string>()
  try {
    const articles = await getFinanceNews()
    headlines = articles.slice(0, 20).map((a) => a.headline)
    sourceSet = new Set(articles.slice(0, 20).map((a) => a.source))
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
    return NextResponse.json(fallback, { headers: EDGE_HEADERS })
  }

  // Fetch cached price snapshot (non-fatal)
  let priceContext = ''
  try {
    const homepage = await redis.get<HomepageData>(HOMEPAGE_CACHE_KEY)
    if (homepage?.tickerQuotes) {
      const snaps: string[] = []
      const LABELS: Record<string, string> = {
        SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000',
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
        for (const c of homepage.commodityStrip.slice(0, 4)) {
          const sign = c.changePercent >= 0 ? '+' : ''
          snaps.push(`${c.name}: ${c.price.toFixed(2)} (${sign}${c.changePercent.toFixed(2)}%)`)
        }
      }
      if (snaps.length > 0) priceContext = `\n\nCurrent Market Snapshot:\n${snaps.join('\n')}`
    }
  } catch { /* non-fatal */ }

  // Read previous brief for delta comparison
  let prevBrief: MarketBriefPayload | null = null
  try {
    prevBrief = await redis.get<MarketBriefPayload>(CACHE_KEY)
  } catch { /* non-fatal */ }

  // Detect session
  const { session, hour, minute } = getMarketSession()
  const etTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

  // Call Groq
  try {
    const systemPrompt = buildSystemPrompt(session, etTime, prevBrief)
    const userMessage = `Today's headlines (${new Date().toUTCString()}, ${headlines.length} from ${sourceSet.size} sources):\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}${priceContext}`

    const completion = await groqChat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature:     0.3,
      max_tokens:      1100,
      response_format: { type: 'json_object' },
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(raw) } catch { parsed = {} }

    const payload: MarketBriefPayload = {
      // v2 narrative fields
      narrative:       typeof parsed.narrative === 'string' ? parsed.narrative : undefined,
      delta:           Array.isArray(parsed.delta) ? (parsed.delta as string[]).slice(0, 4) : undefined,
      session,
      session_context: typeof parsed.session_context === 'string' ? parsed.session_context : undefined,
      looking_ahead:   typeof parsed.looking_ahead === 'string' ? parsed.looking_ahead : undefined,
      confidence:      (['high', 'medium', 'low'] as const).includes(parsed.confidence as 'high') ? parsed.confidence as 'high' | 'medium' | 'low' : undefined,
      // Structured fields
      overnight:      typeof parsed.overnight === 'string' ? parsed.overnight : undefined,
      macro:          typeof parsed.macro === 'string' ? parsed.macro : undefined,
      sectors:        typeof parsed.sectors === 'string' ? parsed.sectors : undefined,
      watchlist:      Array.isArray(parsed.watchlist) ? (parsed.watchlist as Array<{ symbol: string; type: string; direction: 'up' | 'down' | 'volatile'; reason: string }>).slice(0, 5) : undefined,
      // Backward compat
      brief:          typeof parsed.brief === 'string' ? parsed.brief : 'Market analysis unavailable.',
      risks:          Array.isArray(parsed.risks) ? (parsed.risks as string[]).slice(0, 4) : [],
      opportunities:  Array.isArray(parsed.opportunities) ? (parsed.opportunities as string[]).slice(0, 3) : [],
      affectedAssets: Array.isArray(parsed.watchlist)
        ? (parsed.watchlist as Array<{ symbol: string; type: string; direction: string }>).slice(0, 6).map((w) => ({
            symbol: w.symbol, type: w.type as AffectedAsset['type'], direction: w.direction as AffectedAsset['direction'],
          }))
        : (Array.isArray(parsed.affectedAssets) ? (parsed.affectedAssets as AffectedAsset[]).slice(0, 6) : []),
      generatedAt:    Date.now(),
      headlineCount:  headlines.length,
      sourceCount:    sourceSet.size,
    }

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

    return NextResponse.json(payload, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/market-brief]', err instanceof Error ? err.message : err)
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
    return NextResponse.json(fallback, { headers: EDGE_HEADERS })
  }
}
