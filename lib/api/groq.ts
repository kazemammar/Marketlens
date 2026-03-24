import Groq from 'groq-sdk'
import { SentimentAnalysis, SentimentLabel } from '@/lib/utils/types'
import { cachedFetch, cacheKey } from '@/lib/cache/redis'
import { TTL } from '@/lib/utils/constants'

// ─── Client (lazily instantiated) ────────────────────────────────────────

let _client: Groq | null = null

export function getClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY is not set')
    _client = new Groq({ apiKey })
  }
  return _client
}

// ─── Internal ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior equity research analyst. Given news headlines about an asset, provide a structured sentiment assessment following institutional research standards.

Respond with valid JSON only — no markdown fences, no explanation:
{
  "label": "Bullish" | "Bearish" | "Neutral",
  "score": <integer 0-100, where 100 = extremely bullish, 0 = extremely bearish>,
  "summary": "<2-3 sentence assessment. Be specific about what's driving sentiment. Don't just say 'positive news' — name the drivers.>",
  "keySignals": ["<signal 1>", "<signal 2>", "<signal 3>"],
  "catalysts": [
    { "event": "<upcoming event that could move the stock>", "date": "<approximate date or timeframe>", "impact": "bullish" | "bearish" | "uncertain" }
  ],
  "conviction": "high" | "medium" | "low",
  "contrarian_risk": "<1 sentence: what could flip this thesis? What is the market missing?>",
  "time_horizon": "short" | "medium" | "long",
  "regulatory_risk": "<1 sentence: any regulatory headwinds or tailwinds for this asset? Say 'None identified' if not applicable.>"
}

Rules:
- catalysts should list 1-3 upcoming events (earnings, FDA decisions, product launches, macro data) with estimated timing
- conviction reflects how confident the signal is — "low" if headlines are mixed or thin (fewer than 5 headlines = always "low")
- contrarian_risk should identify the non-consensus risk — what bears say if sentiment is bullish, what bulls say if bearish
- time_horizon: "short" (days-weeks), "medium" (1-3 months), "long" (3+ months) — pick the horizon most relevant to current headlines
- regulatory_risk: mention any pending regulation, antitrust, FDA, SEC, or policy changes affecting this asset
- Weight recent headlines (first 5) more heavily than older ones — they reflect current momentum
- Be specific to THIS asset, not generic market commentary`

interface GroqSentimentResponse {
  label:            SentimentLabel
  score:            number
  summary:          string
  keySignals:       string[]
  catalysts?:       Array<{ event: string; date: string; impact: 'bullish' | 'bearish' | 'uncertain' }>
  conviction?:      'high' | 'medium' | 'low'
  contrarian_risk?: string
  time_horizon?:    'short' | 'medium' | 'long'
  regulatory_risk?: string
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Analyze the sentiment of an asset based on recent news headlines.
 *
 * @param symbol    Asset symbol used as cache key and for context
 * @param headlines Array of recent news headlines (max 20 recommended)
 */
export async function analyzeSentiment(
  symbol: string,
  headlines: string[],
): Promise<SentimentAnalysis> {
  // Guard: skip Groq call when no headlines — return a neutral placeholder
  if (!headlines || headlines.length === 0) {
    return {
      symbol,
      label:      'Neutral',
      score:      50,
      summary:    'No recent headlines available for analysis.',
      keySignals: [],
      conviction: 'low',
      analyzedAt: Date.now(),
    }
  }

  return cachedFetch(
    cacheKey.sentiment(symbol),
    TTL.SENTIMENT,
    async () => {
      const client = getClient()

      const userMessage = [
        `Asset: ${symbol}`,
        `Headlines (${headlines.length}):`,
        headlines.slice(0, 20).map((h, i) => `${i + 1}. ${h}`).join('\n'),
      ].join('\n')

      const completion = await client.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature:  0.2,
        max_tokens:   800,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content ?? '{}'
      let parsed: Partial<GroqSentimentResponse>
      try { parsed = JSON.parse(raw) } catch { parsed = {} }

      return {
        symbol,
        label:           isValidLabel(parsed.label) ? parsed.label : 'Neutral',
        score:           clamp(parsed.score ?? 50, 0, 100),
        summary:         parsed.summary ?? 'Insufficient data for analysis.',
        keySignals:      Array.isArray(parsed.keySignals) ? parsed.keySignals.slice(0, 5) : [],
        catalysts:       Array.isArray(parsed.catalysts) ? parsed.catalysts.slice(0, 3) : undefined,
        conviction:      (['high', 'medium', 'low'] as const).includes(parsed.conviction as 'high' | 'medium' | 'low') ? parsed.conviction : undefined,
        contrarian_risk: typeof parsed.contrarian_risk === 'string' ? parsed.contrarian_risk : undefined,
        time_horizon:    (['short', 'medium', 'long'] as const).includes(parsed.time_horizon as 'short' | 'medium' | 'long') ? parsed.time_horizon : undefined,
        regulatory_risk: typeof parsed.regulatory_risk === 'string' ? parsed.regulatory_risk : undefined,
        analyzedAt:      Date.now(),
      } satisfies SentimentAnalysis
    },
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isValidLabel(label: unknown): label is SentimentLabel {
  return label === 'Bullish' || label === 'Bearish' || label === 'Neutral'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── Asset Context ────────────────────────────────────────────────────────

const CONTEXT_SYSTEM_PROMPT = `You are a senior geopolitical and financial intelligence analyst at a multi-strategy hedge fund. Given an asset and recent news headlines, provide a structured analysis of external forces AND a concise investment view.

Respond with valid JSON only — no markdown fences:
{
  "factors": [
    {
      "category": "geopolitical" | "macro" | "sector" | "environmental" | "sentiment" | "regulatory",
      "title": "<short 3-6 word title>",
      "description": "<1 sentence — connect the event to a SPECIFIC impact on this asset's price, revenue, or demand>",
      "impact": "bullish" | "bearish" | "neutral",
      "severity": "HIGH" | "MED" | "LOW"
    }
  ],
  "summary": "<2-3 sentence executive summary of the external environment for this asset>",
  "thesis": "<1 sentence investment thesis — would you be long or short this asset right now, and why?>",
  "competitive_position": "<1-2 sentences on how this company/asset is positioned vs competitors. What is its moat or vulnerability?>",
  "catalyst_calendar": [
    { "event": "<specific upcoming event>", "date": "<approximate date>", "significance": "HIGH" | "MED" | "LOW" }
  ],
  "confidence": "high" | "medium" | "low"
}

Rules:
- Return 4-8 factors, ordered by severity (HIGH first)
- Include "regulatory" category for any pending regulation, antitrust, sanctions, or policy changes
- Be specific to THIS asset — connect world events to concrete business impacts
- thesis should be opinionated: "Long on strength of..." or "Avoid due to..."
- competitive_position: name specific competitors when relevant
- catalyst_calendar: 2-4 upcoming dates that matter for this asset (earnings, regulatory, product launches)
- confidence: "low" if fewer than 5 headlines, "medium" for 5-15, "high" for 15+
- Weight the first 5 headlines more heavily — they are the most recent
- Don't give generic market commentary — every sentence should be about THIS specific asset`

export interface AssetContextFactor {
  category:    'geopolitical' | 'macro' | 'sector' | 'environmental' | 'sentiment' | 'regulatory'
  title:       string
  description: string
  impact:      'bullish' | 'bearish' | 'neutral'
  severity:    'HIGH' | 'MED' | 'LOW'
}

export interface AssetContext {
  symbol:                string
  factors:               AssetContextFactor[]
  summary:               string
  // New fields (optional for backward compat)
  thesis?:               string
  competitive_position?: string
  catalyst_calendar?:    Array<{ event: string; date: string; significance: 'HIGH' | 'MED' | 'LOW' }>
  analyzedAt:            number
}

export async function analyzeAssetContext(
  symbol: string,
  type: string,
  headlines: string[],
  metadata?: { industry?: string; name?: string },
): Promise<AssetContext> {
  // Guard: skip Groq call when no headlines
  if (!headlines || headlines.length === 0) {
    return {
      symbol,
      factors:    [],
      summary:    'No recent headlines available for context analysis.',
      analyzedAt: Date.now(),
    }
  }

  return cachedFetch(
    `context:${symbol.toUpperCase()}`,
    TTL.SENTIMENT,
    async () => {
      const client = getClient()

      const userMessage = [
        `Asset: ${symbol} (${type})`,
        metadata?.name     ? `Company: ${metadata.name}`       : '',
        metadata?.industry ? `Industry: ${metadata.industry}`  : '',
        `Recent Headlines (${headlines.length}):`,
        headlines.slice(0, 25).map((h, i) => `${i + 1}. ${h}`).join('\n'),
      ].filter(Boolean).join('\n')

      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: CONTEXT_SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.3,
        max_tokens:  1200,
        response_format: { type: 'json_object' },
      })

      const raw    = completion.choices[0]?.message?.content ?? '{}'
      let parsed: {
        factors?:              AssetContextFactor[]
        summary?:              string
        thesis?:               string
        competitive_position?: string
        catalyst_calendar?:    Array<{ event: string; date: string; significance: 'HIGH' | 'MED' | 'LOW' }>
      }
      try { parsed = JSON.parse(raw) } catch { parsed = {} }

      return {
        symbol,
        factors:               Array.isArray(parsed.factors) ? parsed.factors.slice(0, 8) : [],
        summary:               parsed.summary ?? 'Context analysis unavailable.',
        thesis:                typeof parsed.thesis === 'string' ? parsed.thesis : undefined,
        competitive_position:  typeof parsed.competitive_position === 'string' ? parsed.competitive_position : undefined,
        catalyst_calendar:     Array.isArray(parsed.catalyst_calendar) ? parsed.catalyst_calendar.slice(0, 4) : undefined,
        analyzedAt:            Date.now(),
      }
    },
  )
}
