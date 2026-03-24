import { cachedFetch } from '@/lib/cache/redis'

export interface FearGreedData {
  score: number
  rating: string
  previousClose: number
  oneWeekAgo: number
  oneMonthAgo: number
  oneYearAgo: number
  indicators: Array<{
    name: string
    score: number
    rating: string
  }>
  history: Array<{ date: string; score: number }>
  fetchedAt: number
}

export async function getFearGreedData(): Promise<FearGreedData | null> {
  return cachedFetch<FearGreedData>(
    'fear-greed:cnn:v1',
    1800, // 30 minutes
    async () => {
      const res = await fetch(
        'https://production.dataviz.cnn.io/index/fearandgreed/graphdata/2024-01-01',
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketLens/1.0)' },
          next: { revalidate: 1800 },
        }
      )
      if (!res.ok) throw new Error(`CNN API ${res.status}`)
      const data = await res.json()

      const fg = data.fear_and_greed
      const hist: Array<{ x: number; y: number }> = data.fear_and_greed_historical?.data ?? []

      const indicators = [
        { name: 'Market Momentum', score: data.market_momentum_sp500?.score ?? 50, rating: data.market_momentum_sp500?.rating ?? 'neutral' },
        { name: 'Stock Strength', score: data.stock_price_strength?.score ?? 50, rating: data.stock_price_strength?.rating ?? 'neutral' },
        { name: 'Stock Breadth', score: data.stock_price_breadth?.score ?? 50, rating: data.stock_price_breadth?.rating ?? 'neutral' },
        { name: 'Put/Call Options', score: data.put_call_options?.score ?? 50, rating: data.put_call_options?.rating ?? 'neutral' },
        { name: 'Market Volatility', score: data.market_volatility_vix?.score ?? 50, rating: data.market_volatility_vix?.rating ?? 'neutral' },
        { name: 'Junk Bond Demand', score: data.junk_bond_demand?.score ?? 50, rating: data.junk_bond_demand?.rating ?? 'neutral' },
        { name: 'Safe Haven Demand', score: data.safe_haven_demand?.score ?? 50, rating: data.safe_haven_demand?.rating ?? 'neutral' },
      ]

      // Get last 30 days of history
      const history = hist.slice(-30).map(d => ({
        date: new Date(d.x).toISOString().slice(0, 10),
        score: Math.round(d.y),
      }))

      // Historical comparisons from history array
      const sorted = [...hist].sort((a, b) => b.x - a.x)
      const getScore = (daysAgo: number) => {
        const target = Date.now() - daysAgo * 86400000
        const closest = sorted.reduce((prev, curr) =>
          Math.abs(curr.x - target) < Math.abs(prev.x - target) ? curr : prev
        )
        return Math.round(closest.y)
      }

      return {
        score: Math.round(fg.score),
        rating: fg.rating,
        previousClose: sorted[1] ? Math.round(sorted[1].y) : Math.round(fg.score),
        oneWeekAgo: getScore(7),
        oneMonthAgo: getScore(30),
        oneYearAgo: getScore(365),
        indicators,
        history,
        fetchedAt: Date.now(),
      }
    }
  )
}
