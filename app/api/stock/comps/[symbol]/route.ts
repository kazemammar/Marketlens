import { NextResponse } from 'next/server'
import { getPeers, getCompanyProfile, getQuote } from '@/lib/api/finnhub'
import { getRatios } from '@/lib/api/fmp'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { redis } from '@/lib/cache/redis'

const CACHE_TTL = 3_600 // 1 hour

export interface CompRow {
  symbol:         string
  name:           string
  logo:           string | null
  industry:       string | null
  marketCap:      number | null  // Finnhub: millions of USD
  price:          number | null
  changePercent:  number | null
  peRatio:        number | null
  evToEbitda:     number | null
  psRatio:        number | null
  profitMargin:   number | null  // decimal fraction (0.25 = 25%)
  returnOnEquity: number | null  // decimal fraction
  dividendYield:  number | null  // decimal fraction
  isCurrent:      boolean
}

export interface CompsPayload {
  rows:        CompRow[]
  medians:     Record<string, number | null>  // peer-only medians per metric
  generatedAt: number
}

// ─── Median helper ────────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  const sorted = values.filter((v) => isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const { symbol: rawSymbol } = await params
  const symbol    = decodeURIComponent(rawSymbol).toUpperCase()
  const cacheKeyStr = `comps:v1:${symbol}`

  // 1. Cache check
  try {
    const cached = await redis.get<CompsPayload>(cacheKeyStr)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through on Redis error */ }

  try {
    // 2. Peer list — take first 6
    const peerSymbols = (await getPeers(symbol)).slice(0, 6)
    const allSymbols  = [symbol, ...peerSymbols]

    // 3. Fetch all data in parallel by type (minimises Redis round-trips)
    const [profileResults, quoteResults, ratioResults] = await Promise.all([
      Promise.allSettled(allSymbols.map((s) => getCompanyProfile(s))),
      Promise.allSettled(allSymbols.map((s) => getQuote(s))),
      Promise.allSettled(allSymbols.map((s) => getRatios(s))),
    ])

    // 4. Assemble rows
    const rows: CompRow[] = allSymbols.map((sym, i) => {
      const profile = profileResults[i].status === 'fulfilled' ? profileResults[i].value : null
      const quote   = quoteResults[i].status   === 'fulfilled' ? quoteResults[i].value   : null
      const ratio   = ratioResults[i].status   === 'fulfilled' ? ratioResults[i].value   : null

      return {
        symbol:         sym,
        name:           profile?.name                  ?? sym,
        logo:           profile?.logo                  ?? null,
        industry:       profile?.finnhubIndustry       ?? null,
        marketCap:      profile?.marketCapitalization  ?? null,
        price:          quote?.price                   ?? null,
        changePercent:  quote?.changePercent           ?? null,
        peRatio:        ratio?.peRatio                 ?? null,
        evToEbitda:     ratio?.evToEbitda              ?? null,
        psRatio:        ratio?.psRatio                 ?? null,
        profitMargin:   ratio?.profitMargin            ?? null,
        returnOnEquity: ratio?.returnOnEquity          ?? null,
        dividendYield:  ratio?.dividendYield           ?? null,
        isCurrent:      sym === symbol,
      }
    })

    // 5. Compute medians from peer rows only (exclude current stock)
    const peerRows = rows.filter((r) => !r.isCurrent)

    const medians: Record<string, number | null> = {
      peRatio:        median(peerRows.map((r) => r.peRatio).filter((v): v is number        => v !== null)),
      evToEbitda:     median(peerRows.map((r) => r.evToEbitda).filter((v): v is number     => v !== null)),
      psRatio:        median(peerRows.map((r) => r.psRatio).filter((v): v is number        => v !== null)),
      profitMargin:   median(peerRows.map((r) => r.profitMargin).filter((v): v is number   => v !== null)),
      returnOnEquity: median(peerRows.map((r) => r.returnOnEquity).filter((v): v is number => v !== null)),
      dividendYield:  median(peerRows.map((r) => r.dividendYield).filter((v): v is number  => v !== null)),
    }

    const payload: CompsPayload = { rows, medians, generatedAt: Date.now() }

    // 6. Cache (fire-and-forget) and respond
    redis.set(cacheKeyStr, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)

  } catch (err) {
    console.error(`[api/stock/comps/${symbol}]`, err)
    return NextResponse.json({ rows: [], medians: {}, generatedAt: Date.now() }, { status: 200 })
  }
}
