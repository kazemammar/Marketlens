const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

/** Map a portfolio symbol + asset type to the correct Yahoo Finance ticker */
export function toYahooSymbol(symbol: string, assetType: string): string {
  if (assetType === 'crypto') {
    // Yahoo crypto format: BTC-USD, ETH-USD, SOL-USD, etc.
    return `${symbol}-USD`
  }
  // Stocks, ETFs, commodities (CL=F, GC=F, NG=F, AAPL, SPY…) use native symbol
  return symbol
}

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

export interface HistoricalDay {
  date:  string  // "2026-03-18"
  close: number
}

export async function getYahooHistory(
  symbol: string,
  range: '1mo' | '3mo' | '6mo' | '1y' = '3mo',
): Promise<HistoricalDay[]> {
  try {
    const res = await fetch(
      `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()
    const result = data.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[]          = result.timestamp ?? []
    const closes: (number | null)[]     = result.indicators?.quote?.[0]?.close ?? []

    return timestamps
      .map((ts, i) => ({
        date:  new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i] ?? 0,
      }))
      .filter((d) => d.close > 0)
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
