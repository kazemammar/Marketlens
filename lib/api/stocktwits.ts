import { cachedFetch } from '@/lib/cache/redis'

export interface StocktwitsSentiment {
  symbol: string
  bullish: number
  bearish: number
  totalMessages: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number // 0-100, 50 = neutral
}

export async function getSymbolSentiment(symbol: string): Promise<StocktwitsSentiment | null> {
  return cachedFetch<StocktwitsSentiment | null>(
    `stocktwits:sentiment:${symbol.toUpperCase()}`,
    600, // 10 min cache
    async () => {
      try {
        const res = await fetch(
          `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(symbol)}.json`,
          {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'MarketLens/1.0' },
          }
        )
        if (!res.ok) return null
        const data = await res.json()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const messages: Array<Record<string, unknown>> = data.messages ?? []
        let bullish = 0, bearish = 0
        for (const msg of messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sentiment = (msg.entities as any)?.sentiment?.basic
          if (sentiment === 'Bullish') bullish++
          if (sentiment === 'Bearish') bearish++
        }
        const total = bullish + bearish
        const score = total > 0 ? Math.round((bullish / total) * 100) : 50

        return {
          symbol: symbol.toUpperCase(),
          bullish,
          bearish,
          totalMessages: messages.length,
          sentiment: score > 60 ? 'bullish' : score < 40 ? 'bearish' : 'neutral',
          sentimentScore: score,
        }
      } catch {
        return null
      }
    }
  )
}
