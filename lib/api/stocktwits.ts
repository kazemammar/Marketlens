import { cachedFetch } from '@/lib/cache/redis'

export interface StocktwitsSymbol {
  symbol: string
  title: string
  watchlistCount: number
  trendingScore: number
  trendingSummary: string | null
  rank: number
}

export interface StocktwitsSentiment {
  symbol: string
  bullish: number
  bearish: number
  totalMessages: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number // 0-100, 50 = neutral
}

export async function getTrendingSymbols(): Promise<StocktwitsSymbol[]> {
  return cachedFetch<StocktwitsSymbol[]>(
    'stocktwits:trending:v1',
    300, // 5 min cache
    async () => {
      try {
        const res = await fetch('https://api.stocktwits.com/api/2/trending/symbols.json', {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'MarketLens/1.0' },
        })
        if (!res.ok) return []
        const data = await res.json()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data.symbols ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => s.instrument_class === 'Stock' || s.instrument_class === 'ExchangeTradedCommodity' || s.instrument_class === 'ExchangeTradedFund')
          .slice(0, 15)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any, i: number) => ({
            symbol: s.symbol,
            title: s.title,
            watchlistCount: s.watchlist_count ?? 0,
            trendingScore: s.trending_score ?? 0,
            trendingSummary: s.trends?.summary ?? null,
            rank: i + 1,
          }))
      } catch {
        return []
      }
    }
  )
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
