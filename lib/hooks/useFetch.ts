'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Module-level cache shared across all instances
const cache = new Map<string, CacheEntry<unknown>>()

interface UseFetchOptions {
  refreshInterval?: number  // ms, default 5 min
  maxAge?: number           // ms, max cache age before showing skeleton, default 30 min
  enabled?: boolean         // default true
}

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: boolean
  lastUpdated: number | null
}

export function useFetch<T>(url: string | null, options: UseFetchOptions = {}): UseFetchResult<T> {
  const {
    refreshInterval = 5 * 60 * 1000,
    enabled = true,
  } = options

  // Initialize from cache synchronously
  const cached = url ? cache.get(url) as CacheEntry<T> | undefined : undefined

  const [data, setData] = useState<T | null>(cached?.data ?? null)
  const [loading, setLoading] = useState(cached ? false : true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(cached?.timestamp ?? null)
  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  const doFetch = useCallback(async (showLoading: boolean) => {
    if (!url || !enabled || fetchingRef.current) return
    fetchingRef.current = true

    if (showLoading) setLoading(true)

    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as T

      if (mountedRef.current) {
        setData(json)
        setError(false)
        setLastUpdated(Date.now())
        // Update module-level cache
        const now = Date.now()
        cache.set(url, { data: json, timestamp: now })
        // Evict oldest entries when cache exceeds 200 entries
        if (cache.size > 200) {
          const entries = [...cache.entries()]
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
          const toDelete = entries.slice(0, entries.length - 150)
          for (const [key] of toDelete) cache.delete(key)
        }
      }
    } catch {
      if (mountedRef.current) setError(true)
    } finally {
      fetchingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [url, enabled])

  useEffect(() => {
    mountedRef.current = true

    if (!url || !enabled) {
      setLoading(false)
      return
    }

    // Stale-while-revalidate: if we have ANY cached data (even stale),
    // show it immediately and refresh silently in the background.
    // Only show loading skeleton when there's no cached data at all.
    doFetch(!cached)

    if (!refreshInterval) return

    // Interval management with visibility-based pausing.
    // When the tab is hidden we stop polling — no point hitting the server for
    // data nobody is looking at. When the tab becomes visible again we
    // immediately re-fetch (catch up on missed updates) then restart the interval.
    let id: ReturnType<typeof setInterval> | null = null

    function startInterval() {
      id = setInterval(() => doFetch(false), refreshInterval)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        if (id !== null) { clearInterval(id); id = null }
      } else {
        // Immediately fetch on return — user sees fresh data instantly
        doFetch(false)
        if (id !== null) clearInterval(id)
        startInterval()
      }
    }

    // Only start the interval if the tab is currently visible
    if (!document.hidden) {
      startInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      mountedRef.current = false
      if (id !== null) clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [url, enabled, refreshInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, lastUpdated }
}
