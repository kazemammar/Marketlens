/**
 * lib/api/polymarket.ts
 * ─────────────────────
 * Polymarket Gamma API client (no API key required)
 * Fetches geopolitical/macro prediction markets
 */

import { cachedFetch } from '@/lib/cache/redis'

const GAMMA_BASE = 'https://gamma-api.polymarket.com'
const CACHE_TTL  = 15 * 60 // 15 minutes

// ─── Types ────────────────────────────────────────────────────────────────

export interface PolymarketMarket {
  id:        string
  question:  string
  yesPrice:  number   // 0–1 probability
  volume:    number   // USD volume
  endDate:   string
  slug:      string
}

// ─── Keywords to filter relevant geopolitical/macro markets ───────────────

const RELEVANT_KEYWORDS = [
  // Geopolitics & conflict
  'oil', 'war', 'iran', 'china', 'trump', 'tariff', 'sanction',
  'nato', 'russia', 'ukraine', 'opec', 'israel', 'nuclear', 'taiwan',
  'missile', 'houthi', 'middle east', 'cease', 'attack', 'conflict',
  'military', 'invasion', 'coup', 'assassination', 'north korea',
  'hezbollah', 'gaza', 'syria', 'yemen', 'south china sea',
  'india', 'pakistan', 'sudan', 'niger', 'wagner',
  // Macro & economics
  'fed', 'rate', 'election', 'recession', 'inflation', 'debt', 'default',
  'g7', 'g20', 'dollar', 'treasury', 'yield', 'gdp', 'unemployment',
  'cpi', 'pce', 'ecb', 'boj', 'pboc', 'imf', 'world bank',
  'stimulus', 'shutdown', 'debt ceiling', 'fiscal',
  // Markets & crypto
  'bitcoin', 'btc', 'ethereum', 'crypto', 'etf', 's&p', 'nasdaq',
  'stock market', 'bear market', 'bull market', 'crash',
  // Energy & commodities
  'opec+', 'natural gas', 'lng', 'pipeline', 'embargo', 'energy crisis',
  'grain', 'food crisis', 'lithium', 'rare earth', 'uranium',
  // Tech & AI
  'ai regulation', 'openai', 'antitrust', 'tiktok', 'semiconductor',
]

function isRelevant(question: string): boolean {
  const lower = question.toLowerCase()
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ─── Raw Gamma API market shape ───────────────────────────────────────────

interface GammaMarketRaw {
  id:              string
  question:        string
  outcomePrices:   string | string[] | null  // API returns JSON string e.g. "[\"0.73\", \"0.27\"]"
  volume:          string | number
  endDate?:        string
  end_date_iso?:   string
  slug?:           string
  active:          boolean
  closed?:         boolean
}

// ─── Main fetch function ──────────────────────────────────────────────────

export async function getPredictionMarkets(): Promise<PolymarketMarket[]> {
  return cachedFetch<PolymarketMarket[]>(
    'polymarket:markets:v2',
    CACHE_TTL,
    async () => {
      const url = `${GAMMA_BASE}/markets?active=true&closed=false&limit=100&order=volume&ascending=false`

      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: CACHE_TTL },
      })

      if (!res.ok) {
        throw new Error(`[polymarket] HTTP ${res.status}`)
      }

      const raw = await res.json() as GammaMarketRaw[]

      const markets: PolymarketMarket[] = []

      for (const m of raw) {
        if (!m.active || m.closed) continue
        if (!isRelevant(m.question)) continue

        // Parse outcomePrices — API returns a JSON string, not an array
        let parsedPrices: string[]
        try {
          parsedPrices = typeof m.outcomePrices === 'string'
            ? JSON.parse(m.outcomePrices)
            : Array.isArray(m.outcomePrices) ? m.outcomePrices : []
        } catch {
          continue
        }
        if (parsedPrices.length < 1) continue

        const yesPrice = parseFloat(parsedPrices[0])
        if (isNaN(yesPrice)) continue

        // Parse volume to number before sorting
        const volume = typeof m.volume === 'string' ? parseFloat(m.volume) : (m.volume ?? 0)

        markets.push({
          id:       m.id,
          question: m.question,
          yesPrice: Math.round(yesPrice * 100) / 100,  // keep 0–1 range
          volume:   Math.round(volume),
          endDate:  m.endDate ?? m.end_date_iso ?? '',
          slug:     m.slug ?? m.id,
        })
      }

      // Sort by volume descending, take top 20
      return markets
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 20)
    },
  )
}
