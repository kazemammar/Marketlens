import { cachedFetch } from '@/lib/cache/redis'

const BASE = 'https://api.twelvedata.com'

export interface TechnicalIndicatorData {
  rsi: number | null
  macd: { macd: number; signal: number; histogram: number } | null
  bbands: { upper: number; middle: number; lower: number } | null
  atr: number | null
  stochastic: { k: number; d: number } | null
  ema20: number | null
  ema50: number | null
  sma200: number | null
}

async function fetchIndicator<T>(endpoint: string, symbol: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) return null

  try {
    const p = new URLSearchParams({ symbol, interval: '1day', apikey: apiKey, ...params })
    const res = await fetch(`${BASE}/${endpoint}?${p}`, {
      headers: { 'User-Agent': 'MarketLens/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === 'error') return null
    return data as T
  } catch {
    return null
  }
}

export async function getTechnicalIndicators(symbol: string): Promise<TechnicalIndicatorData> {
  return cachedFetch<TechnicalIndicatorData>(
    `twelvedata:technicals:${symbol.toUpperCase()}`,
    600,
    async () => {
      const [rsiRes, macdRes, bbandsRes, atrRes, stochRes] = await Promise.allSettled([
        fetchIndicator<{ values: Array<{ rsi: string }> }>('rsi', symbol, { time_period: '14', outputsize: '1' }),
        fetchIndicator<{ values: Array<{ macd: string; macd_signal: string; macd_hist: string }> }>('macd', symbol, { outputsize: '1' }),
        fetchIndicator<{ values: Array<{ upper_band: string; middle_band: string; lower_band: string }> }>('bbands', symbol, { outputsize: '1', sd: '2' }),
        fetchIndicator<{ values: Array<{ atr: string }> }>('atr', symbol, { time_period: '14', outputsize: '1' }),
        fetchIndicator<{ values: Array<{ slow_k: string; slow_d: string }> }>('stoch', symbol, { outputsize: '1' }),
      ])

      const rsiVal = rsiRes.status === 'fulfilled' ? rsiRes.value?.values?.[0] : null
      const macdVal = macdRes.status === 'fulfilled' ? macdRes.value?.values?.[0] : null
      const bbandsVal = bbandsRes.status === 'fulfilled' ? bbandsRes.value?.values?.[0] : null
      const atrVal = atrRes.status === 'fulfilled' ? atrRes.value?.values?.[0] : null
      const stochVal = stochRes.status === 'fulfilled' ? stochRes.value?.values?.[0] : null

      return {
        rsi: rsiVal ? parseFloat(rsiVal.rsi) : null,
        macd: macdVal ? {
          macd: parseFloat(macdVal.macd),
          signal: parseFloat(macdVal.macd_signal),
          histogram: parseFloat(macdVal.macd_hist),
        } : null,
        bbands: bbandsVal ? {
          upper: parseFloat(bbandsVal.upper_band),
          middle: parseFloat(bbandsVal.middle_band),
          lower: parseFloat(bbandsVal.lower_band),
        } : null,
        atr: atrVal ? parseFloat(atrVal.atr) : null,
        stochastic: stochVal ? {
          k: parseFloat(stochVal.slow_k),
          d: parseFloat(stochVal.slow_d),
        } : null,
        ema20: null,
        ema50: null,
        sma200: null,
      }
    }
  )
}
