import Groq from 'groq-sdk'
import { SentimentAnalysis, SentimentLabel } from '@/lib/utils/types'
import { cachedFetch, cacheKey } from '@/lib/cache/redis'
import { TTL } from '@/lib/utils/constants'

// ─── Client (lazily instantiated) ────────────────────────────────────────

let _client: Groq | null = null

function getClient(): Groq {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY is not set')
    _client = new Groq({ apiKey })
  }
  return _client
}

// ─── Internal ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial analyst AI. Given a list of news headlines about an asset, analyze the overall market sentiment.

Respond with valid JSON only — no markdown fences, no explanation. Use this exact shape:
{
  "label": "Bullish" | "Bearish" | "Neutral",
  "score": <integer 0–100, where 100 = extremely bullish, 0 = extremely bearish, 50 = neutral>,
  "summary": "<2–3 sentence summary of the overall sentiment>",
  "keySignals": ["<signal 1>", "<signal 2>", "<signal 3>"]
}`

interface GroqSentimentResponse {
  label:      SentimentLabel
  score:      number
  summary:    string
  keySignals: string[]
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
        model:       'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature:  0.2,
        max_tokens:   512,
        response_format: { type: 'json_object' },
      })

      const raw = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw) as Partial<GroqSentimentResponse>

      return {
        symbol,
        label:      isValidLabel(parsed.label) ? parsed.label : 'Neutral',
        score:      clamp(parsed.score ?? 50, 0, 100),
        summary:    parsed.summary  ?? 'Insufficient data for analysis.',
        keySignals: Array.isArray(parsed.keySignals) ? parsed.keySignals.slice(0, 5) : [],
        analyzedAt: Date.now(),
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

const CONTEXT_SYSTEM_PROMPT = `You are a geopolitical and financial intelligence analyst. Given an asset (stock, crypto, commodity, forex, or ETF) and recent news headlines, identify the key EXTERNAL FORCES currently affecting this asset.

Categorize each force into one of these types:
- "geopolitical" — wars, sanctions, tariffs, trade tensions, elections, political instability
- "macro" — Fed policy, interest rates, inflation, GDP, unemployment, currency strength
- "sector" — industry competition, regulation, technology disruption, supply chain
- "environmental" — climate events, weather, ESG policy, energy transition
- "sentiment" — social media buzz, analyst upgrades/downgrades, institutional buying/selling, retail interest

Respond with valid JSON only — no markdown fences. Use this exact shape:
{
  "factors": [
    {
      "category": "geopolitical" | "macro" | "sector" | "environmental" | "sentiment",
      "title": "<short 3-6 word title>",
      "description": "<1 sentence explaining the impact on this specific asset>",
      "impact": "bullish" | "bearish" | "neutral",
      "severity": "HIGH" | "MED" | "LOW"
    }
  ],
  "summary": "<2-3 sentence executive summary of the overall external environment for this asset>"
}

Return 4-8 factors, ordered by severity (HIGH first). Be specific to THIS asset — don't give generic market commentary. Connect world events to concrete impacts on the asset's price, revenue, supply chain, or demand.`

export interface AssetContextFactor {
  category:    'geopolitical' | 'macro' | 'sector' | 'environmental' | 'sentiment'
  title:       string
  description: string
  impact:      'bullish' | 'bearish' | 'neutral'
  severity:    'HIGH' | 'MED' | 'LOW'
}

export interface AssetContext {
  symbol:     string
  factors:    AssetContextFactor[]
  summary:    string
  analyzedAt: number
}

export async function analyzeAssetContext(
  symbol: string,
  type: string,
  headlines: string[],
  metadata?: { industry?: string; name?: string },
): Promise<AssetContext> {
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
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: CONTEXT_SYSTEM_PROMPT },
          { role: 'user',   content: userMessage },
        ],
        temperature: 0.3,
        max_tokens:  1024,
        response_format: { type: 'json_object' },
      })

      const raw    = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(raw) as { factors?: AssetContextFactor[]; summary?: string }

      return {
        symbol,
        factors:    Array.isArray(parsed.factors) ? parsed.factors.slice(0, 8) : [],
        summary:    parsed.summary ?? 'Context analysis unavailable.',
        analyzedAt: Date.now(),
      }
    },
  )
}
