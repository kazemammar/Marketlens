export function cacheHeaders(sMaxAge: number, staleWhileRevalidate?: number): HeadersInit {
  const swr = staleWhileRevalidate ?? sMaxAge * 14
  return {
    'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  }
}

export function noCacheHeaders(): HeadersInit {
  return { 'Cache-Control': 'no-store, no-cache' }
}
