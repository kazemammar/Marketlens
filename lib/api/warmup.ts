/**
 * Homepage quote warmup
 * ─────────────────────
 * Fetches every Finnhub symbol the homepage needs in ONE coordinated batch,
 * writing each result into the shared `quote:SYMBOL` Redis keys.
 *
 * Called server-side from app/page.tsx before the response is sent.
 * By the time the browser loads and client components fire their API routes
 * (commodities-strip, market-radar, signals, ticker-tape), all quote keys are
 * already in Redis → zero Finnhub calls from those routes.
 *
 * Cold start: ~1 s server-side (6 parallel, 150 ms between batches, 27 symbols).
 * Warm start: instant Redis MGET, no Finnhub calls at all.
 */

import { getQuotesBatched, QuoteRaw } from './finnhub'
import { DEFAULT_STOCKS }             from '@/lib/utils/constants'

// ─── Canonical symbol sets ────────────────────────────────────────────────

/** Symbols used by warroom panels: CommodityStrip, MarketRadar, Signals */
export const WARROOM_SYMBOLS = [
  // CommodityStrip
  'USO', 'BNO', 'UNG', 'GLD', 'SLV', 'CPER', 'WEAT', 'URA',
  // MarketRadar + Signals (overlap with above is fine — deduped below)
  'SPY', 'QQQ', 'VXX', 'TLT',
] as const

/** Every Finnhub symbol the homepage needs — de-duplicated union */
export const ALL_HOMEPAGE_SYMBOLS: string[] = (() => {
  const seen = new Set<string>()
  return [...WARROOM_SYMBOLS, ...DEFAULT_STOCKS].filter((s) => {
    if (seen.has(s)) return false
    seen.add(s)
    return true
  })
})()

// ─── Warmup function ──────────────────────────────────────────────────────

/**
 * Warm the Redis quote cache for every homepage symbol.
 *
 * Uses aggressive-but-safe batching (6 parallel, 150 ms inter-batch delay)
 * rather than the conservative defaults used by individual route handlers.
 * The existing per-symbol "pre-Finnhub re-check" in getQuotesBatched prevents
 * duplicate calls if two server-side renders fire concurrently.
 *
 * Stops immediately on a 429 (the global `finnhub:rl` backoff flag in Redis
 * is set by finnhubGetQuote and checked before every subsequent call).
 */
export async function warmupHomepageQuotes(): Promise<Map<string, QuoteRaw>> {
  return getQuotesBatched(ALL_HOMEPAGE_SYMBOLS, 6, 150)
}
