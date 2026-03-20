import { NextResponse } from 'next/server'
import { getQuote, getFinancialMetrics, getPriceTarget } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'

interface TechSignal {
  name:   string
  value:  string
  signal: 'bullish' | 'bearish' | 'neutral'
}

interface PriceContext {
  price:        number
  week52High:   number | null
  week52Low:    number | null
  targetHigh:   number | null
  targetLow:    number | null
  targetMedian: number | null
}

interface TechResponse {
  signals:       TechSignal[]
  priceContext:  PriceContext | null
  overallSignal: 'bullish' | 'bearish' | 'neutral'
  bullCount:     number
  bearCount:     number
  neutralCount:  number
}

const CACHE_TTL = 300  // 5 min — technical signals are price-based

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cacheKey = `technicals:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get<TechResponse>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const empty: TechResponse = {
    signals: [], priceContext: null,
    overallSignal: 'neutral', bullCount: 0, bearCount: 0, neutralCount: 0,
  }

  try {
    const [quoteRes, metricsRes, targetRes] = await Promise.allSettled([
      getQuote(symbol),
      getFinancialMetrics(symbol),
      getPriceTarget(symbol),
    ])

    const quote   = quoteRes.status   === 'fulfilled' ? quoteRes.value   : null
    const metrics = metricsRes.status === 'fulfilled' ? metricsRes.value : null
    const target  = targetRes.status  === 'fulfilled' ? targetRes.value  : null

    if (!quote || quote.price <= 0) {
      redis.set(cacheKey, empty, { ex: CACHE_TTL }).catch(() => {})
      return NextResponse.json(empty)
    }

    const price    = quote.price
    const signals: TechSignal[] = []

    // 52-week range position
    if (metrics?.week52High && metrics.week52Low) {
      const range    = metrics.week52High - metrics.week52Low
      const position = range > 0 ? ((price - metrics.week52Low) / range) * 100 : 50
      signals.push({
        name:   '52W Range Position',
        value:  `${position.toFixed(0)}%`,
        signal: position > 80 ? 'bearish' : position < 20 ? 'bullish' : 'neutral',
      })
    }

    // Off 52W high
    if (metrics?.week52High) {
      const offHigh = ((price - metrics.week52High) / metrics.week52High) * 100
      signals.push({
        name:   'Off 52W High',
        value:  `${offHigh.toFixed(1)}%`,
        signal: offHigh > -5 ? 'bullish' : offHigh < -20 ? 'bearish' : 'neutral',
      })
    }

    // P/E Ratio
    if (metrics?.peRatio) {
      signals.push({
        name:   'P/E Ratio',
        value:  metrics.peRatio.toFixed(1),
        signal: metrics.peRatio < 15 ? 'bullish' : metrics.peRatio > 35 ? 'bearish' : 'neutral',
      })
    }

    // ROE
    if (metrics?.roe) {
      signals.push({
        name:   'ROE',
        value:  `${metrics.roe.toFixed(1)}%`,
        signal: metrics.roe > 20 ? 'bullish' : metrics.roe < 5 ? 'bearish' : 'neutral',
      })
    }

    // Debt/Equity
    if (metrics?.debtToEquity) {
      signals.push({
        name:   'Debt/Equity',
        value:  metrics.debtToEquity.toFixed(2),
        signal: metrics.debtToEquity < 0.5 ? 'bullish' : metrics.debtToEquity > 2 ? 'bearish' : 'neutral',
      })
    }

    // Current Ratio
    if (metrics?.currentRatio) {
      signals.push({
        name:   'Current Ratio',
        value:  metrics.currentRatio.toFixed(2),
        signal: metrics.currentRatio > 1.5 ? 'bullish' : metrics.currentRatio < 1 ? 'bearish' : 'neutral',
      })
    }

    // Dividend Yield
    if (metrics?.dividendYield && metrics.dividendYield > 0) {
      signals.push({
        name:   'Div Yield',
        value:  `${metrics.dividendYield.toFixed(2)}%`,
        signal: metrics.dividendYield > 3 ? 'bullish' : 'neutral',
      })
    }

    // Analyst target vs current price
    if (target?.median && target.median > 0) {
      const upside = ((target.median - price) / price) * 100
      signals.push({
        name:   'Analyst Target',
        value:  `$${target.median.toFixed(0)} (${upside > 0 ? '+' : ''}${upside.toFixed(0)}%)`,
        signal: upside > 15 ? 'bullish' : upside < -10 ? 'bearish' : 'neutral',
      })
    }

    // Day momentum
    if (quote.changePercent !== undefined) {
      signals.push({
        name:   'Day Momentum',
        value:  `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
        signal: quote.changePercent > 1 ? 'bullish' : quote.changePercent < -1 ? 'bearish' : 'neutral',
      })
    }

    const bullCount    = signals.filter(s => s.signal === 'bullish').length
    const bearCount    = signals.filter(s => s.signal === 'bearish').length
    const neutralCount = signals.length - bullCount - bearCount
    const overallSignal: TechResponse['overallSignal'] =
      bullCount > bearCount + 1 ? 'bullish' :
      bearCount > bullCount + 1 ? 'bearish' : 'neutral'

    const priceContext: PriceContext = {
      price,
      week52High:   metrics?.week52High   ?? null,
      week52Low:    metrics?.week52Low    ?? null,
      targetHigh:   target?.high          ?? null,
      targetLow:    target?.low           ?? null,
      targetMedian: target?.median        ?? null,
    }

    const result: TechResponse = {
      signals, priceContext, overallSignal,
      bullCount, bearCount, neutralCount,
    }

    redis.set(cacheKey, result, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/stock/technicals]', err)
    return NextResponse.json(empty)
  }
}
