const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

export interface YahooQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  marketState: string // PRE, REGULAR, POST, CLOSED
  exchangeTimezoneName: string
}

export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const res = await fetch(
      `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=2d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()
    const meta = data.chart?.result?.[0]?.meta
    if (!meta) return null

    const price     = meta.regularMarketPrice ?? 0
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price
    const change    = price - prevClose
    const changePercent = prevClose ? (change / prevClose) * 100 : 0

    const nowSec = Date.now() / 1000
    const regular = meta.currentTradingPeriod?.regular
    const marketState: string = regular
      ? (nowSec >= regular.start && nowSec <= regular.end ? 'REGULAR' : 'CLOSED')
      : (meta.marketState ?? 'CLOSED')

    return {
      symbol,
      price,
      change,
      changePercent,
      previousClose: prevClose,
      marketState,
      exchangeTimezoneName: meta.exchangeTimezoneName ?? 'America/New_York',
    }
  } catch {
    return null
  }
}

export async function getYahooSparkline(symbol: string): Promise<number[]> {
  try {
    const res = await fetch(
      `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1h&range=5d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()
    const closes: (number | null)[] =
      data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    return closes.filter((c): c is number => c !== null).slice(-40)
  } catch {
    return []
  }
}

export async function getYahooQuotesBatch(symbols: string[]): Promise<YahooQuote[]> {
  const results = await Promise.allSettled(symbols.map((s) => getYahooQuote(s)))
  return results
    .filter(
      (r): r is PromiseFulfilledResult<YahooQuote> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value!)
}
