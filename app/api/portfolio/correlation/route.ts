import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getYahooHistory } from '@/lib/api/yahoo'
import { redis } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'

// Crypto symbol mapping for Yahoo Finance
const CRYPTO_YAHOO: Record<string, string> = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', BNB: 'BNB-USD',
  XRP: 'XRP-USD', ADA: 'ADA-USD', AVAX: 'AVAX-USD', DOGE: 'DOGE-USD',
  DOT: 'DOT-USD', LINK: 'LINK-USD', LTC: 'LTC-USD', MATIC: 'MATIC-USD',
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 10) return 0
  const xs = x.slice(0, n)
  const ys = y.slice(0, n)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, denX = 0, denY = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX
    const dy = ys[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }
  const den = Math.sqrt(denX * denY)
  return den === 0 ? 0 : num / den
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Check cache
  const cacheKey = `correlation:${user.id}`
  try {
    const cached = await redis.get<{ symbols: string[]; matrix: number[][]; generatedAt: number }>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const { data: positions } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type')
    .eq('user_id', user.id)

  if (!positions || positions.length < 3) {
    return NextResponse.json({ symbols: [], matrix: [], generatedAt: Date.now() })
  }

  // Map symbols to Yahoo Finance format
  const symbolMap = new Map<string, string>()
  for (const p of positions) {
    if (p.asset_type === 'forex') continue // Skip forex — no Yahoo history
    const yahooSym = p.asset_type === 'crypto'
      ? (CRYPTO_YAHOO[p.symbol.toUpperCase()] ?? `${p.symbol.toUpperCase()}-USD`)
      : p.symbol
    symbolMap.set(p.symbol, yahooSym)
  }

  // Fetch 3-month daily history for each symbol
  const returnsMap = new Map<string, number[]>()
  const validSymbols: string[] = []

  const results = await Promise.allSettled(
    [...symbolMap.entries()].map(async ([display, yahoo]) => {
      const history = await getYahooHistory(yahoo, '3mo')
      if (history.length < 15) return null
      const returns: number[] = []
      for (let i = 1; i < history.length; i++) {
        if (history[i - 1].close > 0) {
          returns.push((history[i].close - history[i - 1].close) / history[i - 1].close)
        }
      }
      return { display, returns }
    })
  )

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && r.value.returns.length >= 10) {
      validSymbols.push(r.value.display)
      returnsMap.set(r.value.display, r.value.returns)
    }
  }

  if (validSymbols.length < 3) {
    return NextResponse.json({ symbols: [], matrix: [], generatedAt: Date.now() })
  }

  // Build correlation matrix
  const n = validSymbols.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0
      } else if (j > i) {
        const corr = pearsonCorrelation(returnsMap.get(validSymbols[i])!, returnsMap.get(validSymbols[j])!)
        matrix[i][j] = Math.round(corr * 100) / 100
        matrix[j][i] = matrix[i][j]
      }
    }
  }

  const payload = { symbols: validSymbols, matrix, generatedAt: Date.now() }
  redis.set(cacheKey, payload, { ex: 6 * 3600 }).catch(() => {})
  return NextResponse.json(payload)
}
