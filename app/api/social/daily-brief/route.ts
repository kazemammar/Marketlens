// GET /api/social/daily-brief?edition=morning|close|weekend|weekly
// Pulls from 18 dashboard endpoints, Groq writes narrative + picks best slides.
// Cache: 30 min per edition per day.
//
// Editions:
//   morning  — weekday pre-market: overnight recap + what to watch today
//   close    — weekday post-market: day recap + tomorrow setup
//   weekend  — Monday AM: full previous-week recap + this week preview (9 slides)
//   weekly   — Friday PM: week-in-review + next week outlook (9 slides)

import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/api/groq'
import { cachedFetch } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close' | 'weekend' | 'weekly'

type SlideType =
  | 'cover' | 'scoreboard' | 'sentiment' | 'narrative' | 'movers'
  | 'energy' | 'crypto' | 'forex' | 'sectors' | 'radar'
  | 'outlook' | 'pulse' | 'cta'

interface GroqBriefResponse {
  briefTitle:        string
  briefSubtitle:     string
  whyMoved:          string
  energyNarrative:   string
  cryptoNarrative:   string
  forexNarrative:    string
  sentimentVerdict:  string
  weekRecap:         string   // weekly/weekend only
  watchItems:        string[]
  slideOrder:        SlideType[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlideData { type: SlideType; title: string; label: string; content: Record<string, any> }

interface DailyBriefPayload {
  slides:      SlideData[]
  edition:     Edition
  generatedAt: string
  date:        string
  slideCount:  number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_EDITIONS: Edition[] = ['morning', 'close', 'weekend', 'weekly']

function detectEdition(): Edition {
  const now = new Date()
  const day = now.getUTCDay()   // 0=Sun … 6=Sat
  const hour = now.getUTCHours()

  if (day === 0 || day === 6) return 'weekend'
  if (day === 1 && hour < 14) return 'weekend'   // Monday before 2pm UTC → weekend recap
  if (day === 5 && hour >= 17) return 'weekly'    // Friday after 5pm UTC → weekly wrap
  return hour < 17 ? 'morning' : 'close'
}

function isWeeklyEdition(ed: Edition): boolean {
  return ed === 'weekend' || ed === 'weekly'
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

async function fetchEndpoint(base: string, path: string): Promise<unknown> {
  const r = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'MarketLens-DailyBrief/1.0' },
  })
  if (!r.ok) return null
  return r.json()
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const editionParam = req.nextUrl.searchParams.get('edition') as Edition | null
  const edition: Edition = editionParam && VALID_EDITIONS.includes(editionParam)
    ? editionParam : detectEdition()
  const date = todayStr()
  const cacheKey = `social:daily-brief:${edition}:${date}`

  try {
    const payload = await cachedFetch<DailyBriefPayload>(
      cacheKey,
      1800, // 30 min
      () => generateBrief(edition, date),
    )
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[daily-brief] generation failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 },
    )
  }
}

// ─── Generate brief ─────────────────────────────────────────────────────────

async function generateBrief(edition: Edition, date: string): Promise<DailyBriefPayload> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketlens.live'

  // 1. Fetch all 18 endpoints in parallel
  const endpoints: [string, string][] = [
    ['quotes',           '/api/quotes?symbols=SPY,QQQ,DIA,IWM,GC%3DF,CL%3DF,SI%3DF,NG%3DF,BTC-USD,ETH-USD,SOL-USD,DX-Y.NYB'],
    ['movers',           '/api/movers'],
    ['fearGreed',        '/api/fear-greed'],
    ['marketRisk',       '/api/market-risk'],
    ['marketPulse',      '/api/market-pulse'],
    ['news',             '/api/news?page=1&limit=15'],
    ['chokepoints',      '/api/chokepoints'],
    ['commoditiesStrip', '/api/commodities-strip'],
    ['stocks',           '/api/market?tab=stock'],
    ['forexStrength',    '/api/forex/strength'],
    ['sectorSentiment',  '/api/sector-sentiment'],
    ['marketRadar',      '/api/market-radar'],
    ['cryptoFearGreed',  '/api/crypto/fear-greed'],
    ['centralBanks',     '/api/central-banks'],
    ['econCalendar',     '/api/economic-calendar'],
    ['earningsCalendar', '/api/earnings-calendar'],
    ['predictions',      '/api/predictions'],
    ['energy',           '/api/energy'],
  ]

  const settled = await Promise.allSettled(
    endpoints.map(([, path]) => fetchEndpoint(base, path))
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  endpoints.forEach(([key], i) => {
    const result = settled[i]
    data[key] = result.status === 'fulfilled' ? result.value : null
  })

  const extracted = extractData(data)
  const groqResponse = await callGroq(edition, extracted)
  const slides = buildSlides(groqResponse, extracted, edition)

  return {
    slides,
    edition,
    generatedAt: new Date().toISOString(),
    date,
    slideCount: slides.length,
  }
}

// ─── Data extraction ────────────────────────────────────────────────────────

interface ExtractedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quotes: Record<string, any>
  gainers: Array<{ symbol: string; name: string; change: number; changePercent: number; price: number }>
  losers:  Array<{ symbol: string; name: string; change: number; changePercent: number; price: number }>
  fearGreed: { score: number; rating: string } | null
  cryptoFearGreed: { score: number; label: string } | null
  riskLevel: { score: number; label: string } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  radarVerdict: { verdict: string; signals: any[] } | null
  chokepoints: Array<{ name: string; status: string; description: string }>
  forexStrength: Array<{ currency: string; score: number }>
  sectorSentiment: Array<{ sector: string; score: number }>
  headlines: string[]
  pulseText: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commodities: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  centralBanks: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  econEvents: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  earnings: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  predictions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  energy: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractData(raw: Record<string, any>): ExtractedData {
  const quotes = raw.quotes ?? {}

  let gainers: ExtractedData['gainers'] = []
  let losers: ExtractedData['losers'] = []
  if (raw.movers) {
    const m = raw.movers
    gainers = (m.gainers ?? m.topGainers ?? []).slice(0, 5).map(mapMover)
    losers  = (m.losers  ?? m.topLosers  ?? []).slice(0, 5).map(mapMover)
  }
  if (gainers.length === 0 && raw.stocks) {
    const stocks = Array.isArray(raw.stocks) ? raw.stocks : (raw.stocks.data ?? raw.stocks.stocks ?? [])
    const sorted = [...stocks]
      .filter((s: { changePercent?: number }) => typeof s.changePercent === 'number')
      .sort((a: { changePercent: number }, b: { changePercent: number }) => b.changePercent - a.changePercent)
    gainers = sorted.slice(0, 5).map(mapMover)
    losers  = sorted.slice(-5).reverse().map(mapMover)
  }

  const fg = raw.fearGreed
  const fearGreed = fg ? { score: fg.score ?? fg.value ?? 50, rating: fg.rating ?? fg.label ?? 'Neutral' } : null

  const cfg = raw.cryptoFearGreed
  const cryptoFearGreed = cfg ? {
    score: Number(cfg.data?.[0]?.value ?? cfg.score ?? cfg.value ?? 50),
    label: cfg.data?.[0]?.value_classification ?? cfg.label ?? 'Neutral',
  } : null

  const risk = raw.marketRisk
  const riskLevel = risk ? { score: risk.score ?? risk.level ?? 50, label: risk.label ?? risk.rating ?? 'Moderate' } : null

  const radar = raw.marketRadar
  const radarVerdict = radar ? {
    verdict: radar.verdict ?? radar.signal ?? 'MIXED',
    signals: radar.signals ?? radar.items ?? [],
  } : null

  const cp = raw.chokepoints
  const chokepoints = Array.isArray(cp)
    ? cp.map((c: { name: string; status: string; description?: string; detail?: string }) => ({
        name: c.name ?? '', status: c.status ?? 'NORMAL', description: c.description ?? c.detail ?? '',
      }))
    : (cp?.chokepoints ?? []).map((c: { name: string; status: string; description?: string; detail?: string }) => ({
        name: c.name ?? '', status: c.status ?? 'NORMAL', description: c.description ?? c.detail ?? '',
      }))

  const fx = raw.forexStrength
  const forexStrength = Array.isArray(fx)
    ? fx.map((f: { currency: string; score: number; strength?: number }) => ({ currency: f.currency, score: f.score ?? f.strength ?? 0 }))
    : (fx?.currencies ?? fx?.data ?? []).map((f: { currency: string; score: number; strength?: number }) => ({
        currency: f.currency, score: f.score ?? f.strength ?? 0,
      }))

  const ss = raw.sectorSentiment
  const sectorSentiment = Array.isArray(ss)
    ? ss.map((s: { sector: string; name?: string; score: number; sentiment?: number }) => ({ sector: s.sector ?? s.name ?? '', score: s.score ?? s.sentiment ?? 0 }))
    : (ss?.sectors ?? ss?.data ?? []).map((s: { sector: string; name?: string; score: number; sentiment?: number }) => ({
        sector: s.sector ?? s.name ?? '', score: s.score ?? s.sentiment ?? 0,
      }))

  const newsRaw = raw.news
  const articles = Array.isArray(newsRaw) ? newsRaw : (newsRaw?.articles ?? newsRaw?.data ?? [])
  const headlines = articles.slice(0, 15).map((a: { headline?: string; title?: string }) => a.headline ?? a.title ?? '')
    .filter(Boolean)

  const pulse = raw.marketPulse
  const pulseText = typeof pulse === 'string' ? pulse : (pulse?.text ?? pulse?.summary ?? pulse?.pulse ?? '')

  const commodities = raw.commoditiesStrip
    ? (Array.isArray(raw.commoditiesStrip) ? raw.commoditiesStrip : raw.commoditiesStrip.data ?? [])
    : []

  const centralBanks = raw.centralBanks
    ? (Array.isArray(raw.centralBanks) ? raw.centralBanks : raw.centralBanks.banks ?? raw.centralBanks.data ?? [])
    : []
  const econEvents = raw.econCalendar
    ? (Array.isArray(raw.econCalendar) ? raw.econCalendar : raw.econCalendar.events ?? raw.econCalendar.data ?? [])
    : []
  const earnings = raw.earningsCalendar
    ? (Array.isArray(raw.earningsCalendar) ? raw.earningsCalendar : raw.earningsCalendar.earnings ?? raw.earningsCalendar.data ?? [])
    : []
  const predictions = raw.predictions
    ? (Array.isArray(raw.predictions) ? raw.predictions : raw.predictions.markets ?? raw.predictions.data ?? [])
    : []
  const energy = raw.energy ?? null

  return {
    quotes, gainers, losers, fearGreed, cryptoFearGreed, riskLevel,
    radarVerdict, chokepoints, forexStrength, sectorSentiment, headlines,
    pulseText, commodities, centralBanks, econEvents, earnings, predictions, energy,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMover(m: any) {
  return {
    symbol: m.symbol ?? m.ticker ?? '',
    name:   m.name ?? m.companyName ?? m.symbol ?? '',
    change: m.change ?? m.priceChange ?? 0,
    changePercent: m.changePercent ?? m.changesPercentage ?? m.change_percent ?? 0,
    price:  m.price ?? m.lastPrice ?? 0,
  }
}

// ─── Groq call ──────────────────────────────────────────────────────────────

const EDITION_PROMPTS: Record<Edition, string> = {
  morning: `This is the MORNING PRE-MARKET brief.
Focus on: what happened overnight (Asia/Europe sessions), pre-market futures,
what to watch TODAY (earnings reports, economic data releases, Fed speakers,
geopolitical developments). Set the tone for the trading day ahead.
Frame everything as forward-looking: "Here's what you need to know before the bell."`,

  close: `This is the EVENING POST-MARKET brief.
Focus on: how today actually played out vs expectations, the dominant story that
moved markets, sector rotation patterns, which sectors led/lagged, why winners won
and losers lost. Frame everything as "Here's what happened and what it means."
Include a setup for tomorrow.`,

  weekend: `This is the WEEKEND BRIEF posted Monday morning.
Provide a FULL RECAP of the previous trading week: how each major index performed
over the entire week, the week's biggest stories and turning points, which sectors
rotated in/out, the week's top movers. Then preview what to watch THIS WEEK:
key economic data, earnings season, Fed activity, geopolitical risks.
Think of this as a comprehensive weekly intelligence report.`,

  weekly: `This is the WEEKLY WRAP posted Friday evening.
Provide a comprehensive WEEK IN REVIEW: how the week started vs how it ended,
the narrative arc of the week (what changed from Monday to Friday), cumulative
weekly performance for major indices, the week's defining moments and surprises.
Then give a forward look at next week's catalysts and risks.
Think of this as closing the chapter on this week.`,
}

async function callGroq(edition: Edition, d: ExtractedData): Promise<GroqBriefResponse> {
  const weekly = isWeeklyEdition(edition)
  const middleSlideCount = weekly ? 7 : 5

  const quoteLines = ['SPY', 'QQQ', 'DIA', 'IWM', 'GC=F', 'CL=F', 'SI=F', 'NG=F', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'DX-Y.NYB']
    .map(sym => {
      const q = d.quotes[sym]
      if (!q) return null
      const pct = q.changePercent ?? ((q.change / (q.price - q.change)) * 100)
      return `${sym}: $${q.price?.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct?.toFixed(2)}%)`
    }).filter(Boolean).join('\n')

  const gainerLines = d.gainers.slice(0, 5).map(g =>
    `${g.symbol}: +${g.changePercent?.toFixed(2)}% ($${g.price?.toFixed(2)})`
  ).join(', ')

  const loserLines = d.losers.slice(0, 5).map(l =>
    `${l.symbol}: ${l.changePercent?.toFixed(2)}% ($${l.price?.toFixed(2)})`
  ).join(', ')

  const chokepointLines = d.chokepoints
    .filter(c => c.status !== 'NORMAL')
    .map(c => `${c.name}: ${c.status} — ${c.description}`)
    .join('\n') || 'All chokepoints NORMAL'

  const fxLines = d.forexStrength
    .sort((a, b) => b.score - a.score)
    .map(f => `${f.currency}: ${f.score > 0 ? '+' : ''}${f.score.toFixed(1)}`)
    .join(', ')

  const sectorLines = d.sectorSentiment
    .sort((a, b) => b.score - a.score)
    .map(s => `${s.sector}: ${s.score > 0 ? '+' : ''}${s.score.toFixed(1)}`)
    .join(', ')

  const headlineBlock = d.headlines.slice(0, 10).map((h, i) => `${i + 1}. ${h}`).join('\n')

  const earningsList = d.earnings.slice(0, 8).map((e: { symbol?: string; ticker?: string }) =>
    e.symbol ?? e.ticker ?? ''
  ).filter(Boolean).join(', ')

  const predictionLines = d.predictions.slice(0, 5).map((p: { question?: string; title?: string; probability?: number }) =>
    `${p.question ?? p.title ?? ''} (${(p.probability ?? 0) > 1 ? p.probability : ((p.probability ?? 0) * 100).toFixed(0)}%)`
  ).join('\n')

  const weekRecapField = weekly
    ? `"weekRecap": "<4-6 sentence comprehensive week summary — how the week started, key turning points, how it ended, the dominant narrative arc>",`
    : ''

  const systemPrompt = `You are a senior financial content strategist creating a market brief for Instagram carousel slides.

${EDITION_PROMPTS[edition]}

LIVE MARKET DATA:

PRICES:
${quoteLines}

TOP GAINERS: ${gainerLines || 'N/A'}
TOP LOSERS: ${loserLines || 'N/A'}

CNN FEAR & GREED: ${d.fearGreed ? `${d.fearGreed.score} (${d.fearGreed.rating})` : 'N/A'}
CRYPTO FEAR & GREED: ${d.cryptoFearGreed ? `${d.cryptoFearGreed.score} (${d.cryptoFearGreed.label})` : 'N/A'}
RISK LEVEL: ${d.riskLevel ? `${d.riskLevel.score} (${d.riskLevel.label})` : 'N/A'}
RADAR VERDICT: ${d.radarVerdict ? d.radarVerdict.verdict : 'N/A'}

CHOKEPOINTS:
${chokepointLines}

FOREX STRENGTH: ${fxLines || 'N/A'}
SECTOR SENTIMENT: ${sectorLines || 'N/A'}
MARKET PULSE: ${d.pulseText || 'N/A'}

HEADLINES:
${headlineBlock || 'N/A'}

UPCOMING EARNINGS: ${earningsList || 'None today'}

POLYMARKET:
${predictionLines || 'N/A'}

Respond with valid JSON only — no markdown fences:
{
  "briefTitle": "<powerful headline, max 10 words, attention-grabbing and specific>",
  "briefSubtitle": "<key numbers, max 65 chars, use · separator, e.g. S&P -1.7% · Oil $101 · Gold ATH · Fear: 10>",
  "whyMoved": "<3-4 sentences: the MAIN STORY driving markets with specific events, names, countries, sectors>",
  ${weekRecapField}
  "energyNarrative": "<1 sentence on oil/commodities, max 20 words>",
  "cryptoNarrative": "<1 sentence on crypto, max 20 words>",
  "forexNarrative": "<1 sentence on USD/FX, max 20 words>",
  "sentimentVerdict": "<1 punchy sentence on what fear/greed means, max 15 words>",
  "watchItems": ["<${weekly ? '4-6' : '3-4'} things to watch, each max 12 words>"],
  "slideOrder": ["cover", "<${middleSlideCount} best middle slides>", "cta"]
}

SLIDE SELECTION RULES:
- ALWAYS start with "cover" and end with "cta"
- Pick exactly ${middleSlideCount} middle slides from: scoreboard, sentiment, narrative, movers, energy, crypto, forex, sectors, radar, outlook, pulse
- ${weekly ? 'For weekly briefs, ALWAYS include scoreboard and narrative. Pick 5 more from the rest.' : 'Pick the slides with the most interesting/dramatic data TODAY — skip boring ones.'}
- Be opinionated. If crypto barely moved, skip it. If oil spiked 5%, include energy.
- "narrative" = the why-things-moved story slide
- "outlook" = what to watch next (forward-looking)
- "scoreboard" = the 6-index price grid
- "pulse" = AI analysis text + headlines

WRITING RULES:
- briefTitle: make it scroll-stopping, specific to today (not "Market Recap")
- whyMoved: tell a STORY with cause and effect, name specific events
- Be direct, opinionated, and use trader language`

  const dateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const editionLabels: Record<Edition, string> = {
    morning: 'morning pre-market',
    close: 'evening post-market',
    weekend: 'Monday morning weekend recap',
    weekly: 'Friday evening weekly wrap',
  }

  const completion = await groqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Generate the ${editionLabels[edition]} brief for ${dateFormatted}.` },
    ],
    temperature:     0.4,
    max_tokens:      weekly ? 1600 : 1200,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: Partial<GroqBriefResponse>
  try { parsed = JSON.parse(raw) } catch { parsed = {} }

  // Validate + enforce slide order rules
  let slideOrder = Array.isArray(parsed.slideOrder) ? parsed.slideOrder : []
  slideOrder = slideOrder.filter((s: string) => s !== 'cover' && s !== 'cta')
  slideOrder = ['cover' as SlideType, ...slideOrder.slice(0, middleSlideCount), 'cta' as SlideType]

  return {
    briefTitle:       parsed.briefTitle       ?? 'Market Brief',
    briefSubtitle:    parsed.briefSubtitle    ?? '',
    whyMoved:         parsed.whyMoved         ?? '',
    weekRecap:        parsed.weekRecap        ?? '',
    energyNarrative:  parsed.energyNarrative  ?? '',
    cryptoNarrative:  parsed.cryptoNarrative  ?? '',
    forexNarrative:   parsed.forexNarrative   ?? '',
    sentimentVerdict: parsed.sentimentVerdict  ?? '',
    watchItems:       Array.isArray(parsed.watchItems) ? parsed.watchItems.slice(0, 6) : [],
    slideOrder:       slideOrder as SlideType[],
  }
}

// ─── Build slides ───────────────────────────────────────────────────────────

function buildSlides(
  groq: GroqBriefResponse,
  d: ExtractedData,
  edition: Edition,
): SlideData[] {
  const weekly = isWeeklyEdition(edition)

  const SYMBOL_LABELS: Record<string, string> = {
    'SPY': 'S&P 500', 'QQQ': 'Nasdaq 100', 'DIA': 'Dow Jones', 'IWM': 'Russell 2000',
    'GC=F': 'Gold', 'CL=F': 'Crude Oil', 'SI=F': 'Silver', 'NG=F': 'Nat Gas',
    'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'SOL-USD': 'Solana', 'DX-Y.NYB': 'US Dollar',
  }

  const EDITION_LABELS: Record<Edition, string> = {
    morning: 'MORNING BRIEF', close: 'CLOSING BRIEF',
    weekend: 'WEEKEND BRIEF', weekly: 'WEEKLY WRAP',
  }

  const builders: Record<SlideType, () => SlideData> = {
    cover: () => {
      // Edition-specific hero data for visual differentiation
      const heroSyms = edition === 'morning'
        ? ['SPY', 'QQQ', 'BTC-USD']           // pre-market focus
        : edition === 'close'
        ? ['SPY', 'QQQ', 'DIA', 'IWM']        // full index scorecard
        : ['SPY', 'QQQ', 'BTC-USD', 'GC=F']   // weekly overview
      const heroQuotes = heroSyms.map(sym => ({
        symbol: sym, name: SYMBOL_LABELS[sym] ?? sym,
        price: d.quotes[sym]?.price ?? 0,
        changePercent: d.quotes[sym]?.changePercent ?? 0,
      }))
      return {
        type: 'cover' as SlideType,
        title: groq.briefTitle,
        label: EDITION_LABELS[edition],
        content: {
          subtitle: groq.briefSubtitle,
          edition,
          heroQuotes,
          topGainer: d.gainers[0] ?? null,
          topLoser: d.losers[0] ?? null,
          fearGreedScore: d.fearGreed?.score ?? null,
        },
      }
    },

    scoreboard: () => ({
      type: 'scoreboard',
      title: weekly ? 'Weekly Levels' : 'Market Snapshot',
      label: weekly ? 'WEEK CLOSE' : 'KEY LEVELS',
      content: {
        quotes: ['SPY', 'QQQ', 'DIA', 'IWM', 'BTC-USD', 'GC=F', 'CL=F', 'DX-Y.NYB'].map(sym => {
          const q = d.quotes[sym]
          return {
            symbol: sym, name: SYMBOL_LABELS[sym] ?? sym,
            price: q?.price ?? 0,
            change: q?.change ?? 0,
            changePercent: q?.changePercent ?? 0,
          }
        }),
      },
    }),

    sentiment: () => ({
      type: 'sentiment',
      title: 'Market Sentiment',
      label: 'FEAR & GREED',
      content: {
        fearGreed: d.fearGreed,
        cryptoFearGreed: d.cryptoFearGreed,
        riskLevel: d.riskLevel,
        radarVerdict: d.radarVerdict?.verdict ?? 'MIXED',
        sentimentVerdict: groq.sentimentVerdict,
      },
    }),

    narrative: () => ({
      type: 'narrative',
      title: weekly
        ? (edition === 'weekend' ? 'Last Week in Review' : 'The Week That Was')
        : (edition === 'morning' ? 'Overnight Story' : 'Why Markets Moved'),
      label: weekly ? 'WEEK NARRATIVE' : 'MARKET NARRATIVE',
      content: {
        narrative: weekly && groq.weekRecap ? groq.weekRecap : groq.whyMoved,
        chokepoints: d.chokepoints.filter(c => c.status !== 'NORMAL'),
      },
    }),

    movers: () => ({
      type: 'movers',
      title: weekly ? "Week's Top Movers" : 'Top Movers',
      label: 'WINNERS & LOSERS',
      content: {
        gainers: d.gainers.slice(0, 5),
        losers:  d.losers.slice(0, 5),
      },
    }),

    energy: () => {
      const oil = d.quotes['CL=F']
      const gold = d.quotes['GC=F']
      const silver = d.quotes['SI=F']
      const natgas = d.quotes['NG=F']
      return {
        type: 'energy',
        title: 'Energy & Commodities',
        label: 'COMMODITIES',
        content: {
          oil:   oil ? { price: oil.price, change: oil.change, changePercent: oil.changePercent } : null,
          gold:  gold ? { price: gold.price, change: gold.change, changePercent: gold.changePercent } : null,
          silver: silver ? { price: silver.price, change: silver.change, changePercent: silver.changePercent } : null,
          natgas: natgas ? { price: natgas.price, change: natgas.change, changePercent: natgas.changePercent } : null,
          narrative: groq.energyNarrative,
        },
      }
    },

    crypto: () => ({
      type: 'crypto',
      title: 'Crypto Markets',
      label: 'DIGITAL ASSETS',
      content: {
        btc: d.quotes['BTC-USD'] ? { price: d.quotes['BTC-USD'].price, change: d.quotes['BTC-USD'].change, changePercent: d.quotes['BTC-USD'].changePercent } : null,
        eth: d.quotes['ETH-USD'] ? { price: d.quotes['ETH-USD'].price, change: d.quotes['ETH-USD'].change, changePercent: d.quotes['ETH-USD'].changePercent } : null,
        sol: d.quotes['SOL-USD'] ? { price: d.quotes['SOL-USD'].price, change: d.quotes['SOL-USD'].change, changePercent: d.quotes['SOL-USD'].changePercent } : null,
        cryptoFearGreed: d.cryptoFearGreed,
        narrative: groq.cryptoNarrative,
      },
    }),

    forex: () => ({
      type: 'forex',
      title: 'Currency Markets',
      label: 'FOREX STRENGTH',
      content: {
        dxy: d.quotes['DX-Y.NYB'] ? {
          price: d.quotes['DX-Y.NYB'].price,
          change: d.quotes['DX-Y.NYB'].change,
          changePercent: d.quotes['DX-Y.NYB'].changePercent,
        } : null,
        currencies: d.forexStrength.sort((a, b) => b.score - a.score),
        narrative: groq.forexNarrative,
      },
    }),

    sectors: () => ({
      type: 'sectors',
      title: 'Sector Sentiment',
      label: 'SECTOR ROTATION',
      content: {
        sectors: d.sectorSentiment.sort((a, b) => b.score - a.score),
      },
    }),

    radar: () => ({
      type: 'radar',
      title: 'Market Radar',
      label: 'SIGNAL ANALYSIS',
      content: {
        verdict: d.radarVerdict?.verdict ?? 'MIXED',
        signals: (d.radarVerdict?.signals ?? []).slice(0, 6),
      },
    }),

    outlook: () => {
      const lookAhead = edition === 'morning' ? 'today' : edition === 'close' ? 'tomorrow' : 'this week'
      return {
        type: 'outlook',
        title: weekly
          ? (edition === 'weekend' ? 'Week Ahead' : 'Next Week Preview')
          : (edition === 'morning' ? 'Watch Today' : 'Watch Tomorrow'),
        label: `WHAT TO WATCH ${lookAhead === 'this week' ? 'THIS WEEK' : lookAhead.toUpperCase()}`,
        content: {
          watchItems: groq.watchItems,
          econEvents: d.econEvents.slice(0, 4).map((e: { event?: string; name?: string; title?: string }) =>
            e.event ?? e.name ?? e.title ?? ''
          ).filter(Boolean),
          earnings: d.earnings.slice(0, 6).map((e: { symbol?: string; ticker?: string }) =>
            e.symbol ?? e.ticker ?? ''
          ).filter(Boolean),
        },
      }
    },

    pulse: () => ({
      type: 'pulse',
      title: 'AI Market Pulse',
      label: 'AI ANALYSIS',
      content: {
        pulseText: d.pulseText,
        headlines: d.headlines.slice(0, 4),
      },
    }),

    cta: () => {
      const followCtas: Record<Edition, string> = {
        morning: 'Follow for the closing brief tonight',
        close: "Follow for tomorrow's morning brief",
        weekend: 'Follow for daily market briefs all week',
        weekly: "Follow for Monday's weekend brief",
      }
      return {
        type: 'cta',
        title: 'MarketLens',
        label: 'FOLLOW FOR MORE',
        content: {
          edition,
          tagline: 'Real-time prices. AI analysis. Geopolitical intelligence.',
          followCta: followCtas[edition],
        },
      }
    },
  }

  return groq.slideOrder.map(type => {
    const builder = builders[type]
    return builder ? builder() : builders.cover()
  })
}
