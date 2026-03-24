import { Redis } from '@upstash/redis'

// ─── In-memory fallback cache ─────────────────────────────────────────────
// Used transparently when Upstash Redis is unreachable (network error,
// missing env vars, service outage).  Capped at 500 entries to bound memory.

const memCache = new Map<string, { value: unknown; expires: number }>()
const MEM_CACHE_CAP = 500

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) { memCache.delete(key); return null }
  return entry.value as T
}

function memSet(key: string, value: unknown, ttlSecs: number): void {
  if (memCache.size >= MEM_CACHE_CAP) {
    const first = memCache.keys().next().value
    if (first !== undefined) memCache.delete(first)
  }
  memCache.set(key, { value, expires: Date.now() + ttlSecs * 1_000 })
}

// Periodically purge expired entries so they don't count against the cap
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memCache) {
      if (now > entry.expires) memCache.delete(key)
    }
  }, 60_000) // every 60 seconds
}

const DEBUG = process.env.NODE_ENV === 'development'

// ─── Client ───────────────────────────────────────────────────────────────

export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
})

// ─── Generic cached fetch ─────────────────────────────────────────────────

/**
 * Check Redis for a cached value. If missing, call `fetcher()`, store the
 * result with the given TTL (seconds), and return it.
 *
 * Falls back to an in-memory Map cache if Redis is unavailable, so the app
 * continues to work even when Upstash is down.
 */
export async function cachedFetch<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // 1. Try Redis
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      if (DEBUG) console.log(`[cache] HIT  ${key}`)
      return cached
    }
  } catch (err) {
    if (DEBUG) console.warn(`[cache] Redis read failed for "${key}":`, (err as Error).message)
    // Redis down — try in-memory fallback before hitting the API
    const mem = memGet<T>(key)
    if (mem !== null) {
      if (DEBUG) console.log(`[cache] MEM-HIT  ${key}`)
      return mem
    }
  }

  // 2. Cache miss (or Redis error) — call the real API
  if (DEBUG) console.log(`[cache] MISS ${key}`)
  const data = await fetcher()

  // 3. Store in both Redis and in-memory (fire-and-forget for Redis)
  memSet(key, data, ttl)
  redis.set(key, data, { ex: ttl }).catch((err: unknown) => {
    console.warn(`[cache] Redis write failed for "${key}":`, (err as Error).message)
  })

  return data
}

/**
 * Invalidate (delete) a cached key from both Redis and in-memory store.
 */
export async function invalidateCache(key: string): Promise<void> {
  memCache.delete(key)
  await redis.del(key).catch(() => {})
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
