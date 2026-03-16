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
  'oil', 'war', 'iran', 'china', 'trump', 'tariff', 'sanction',
  'fed', 'rate', 'election', 'nato', 'russia', 'ukraine', 'opec',
  'israel', 'recession', 'inflation', 'nuclear', 'taiwan', 'missile',
  'houthi', 'middle east', 'g7', 'g20', 'dollar', 'bitcoin', 'btc',
  'cease', 'attack', 'conflict', 'military', 'debt', 'default',
]

function isRelevant(question: string): boolean {
  const lower = question.toLowerCase()
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw))
}

// ─── Raw Gamma API market shape ───────────────────────────────────────────

interface GammaMarketRaw {
  id:              string
  question:        string
  outcomePrices:   string[] | null   // ["0.73", "0.27"]
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
    'polymarket:markets',
    CACHE_TTL,
    async () => {
      const url = `${GAMMA_BASE}/markets?active=true&limit=100&order=volume&ascending=false`

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
        if (!m.outcomePrices || m.outcomePrices.length < 1) continue

        const yesPriceStr = m.outcomePrices[0]
        const yesPrice    = parseFloat(yesPriceStr)
        if (isNaN(yesPrice)) continue

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
