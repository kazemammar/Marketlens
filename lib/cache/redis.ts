import { Redis } from '@upstash/redis'

// ─── Client ───────────────────────────────────────────────────────────────

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ─── Generic cached fetch ─────────────────────────────────────────────────

/**
 * Check Redis for a cached value. If missing, call `fetcher()`, store the
 * result with the given TTL (seconds), and return it.
 *
 * @param key     Redis key
 * @param ttl     Time-to-live in seconds
 * @param fetcher Async function that performs the real API call
 */
export async function cachedFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Try cache — non-fatal if Redis is misconfigured or unavailable
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      console.log(`[cache] HIT  ${key}`)
      return cached
    }
  } catch (err) {
    console.warn(`[cache] Redis read failed for "${key}":`, (err as Error).message)
    // Fall through to live fetch
  }

  // 2. Cache miss (or Redis error) — call the real API
  console.log(`[cache] MISS ${key}`)
  const data = await fetcher()

  // 3. Store result (fire-and-forget — don't block the response)
  redis.set(key, data, { ex: ttl }).catch((err: unknown) => {
    console.warn(`[cache] Redis write failed for "${key}":`, (err as Error).message)
  })

  return data
}

/**
 * Invalidate (delete) a cached key.
 */
export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key)
}

/**
 * Build namespaced cache keys to avoid collisions.
 */
export const cacheKey = {
  quote:           (symbol: string)           => `quote:${symbol.toUpperCase()}`,
  search:          (query: string, type = '') => `search:${query.toLowerCase()}:${type}`,
  news:            (symbol: string)           => `news:${symbol.toUpperCase()}`,
  sentiment:       (symbol: string)           => `sentiment:${symbol.toUpperCase()}`,
  financials:      (symbol: string)           => `financials:${symbol.toUpperCase()}`,
  ratios:          (symbol: string)           => `ratios:${symbol.toUpperCase()}`,
  recommendations: (symbol: string)           => `recs:${symbol.toUpperCase()}`,
  profile:         (symbol: string)           => `profile:${symbol.toUpperCase()}`,
  cryptoMarkets:   (page: number)             => `crypto:markets:${page}`,
  cryptoDetail:    (id: string)               => `crypto:detail:${id.toLowerCase()}`,
  forex:           (pair: string)             => `forex:${pair.toUpperCase()}`,
  commodities:     ()                         => 'commodities:all',
  etf:             (symbol: string)           => `etf:${symbol.toUpperCase()}`,
  rss:             ()                         => 'rss:articles',
}
