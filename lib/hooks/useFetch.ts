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
    maxAge = 30 * 60 * 1000,
    enabled = true,
  } = options

  // Initialize from cache synchronously
  const cached = url ? cache.get(url) as CacheEntry<T> | undefined : undefined
  const isStale = cached ? Date.now() - cached.timestamp > maxAge : true

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
        cache.set(url, { data: json, timestamp: Date.now() })
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

    // If we have cached data, don't show loading — just silently refetch
    if (cached && !isStale) {
      doFetch(false) // silent background refresh
    } else {
      doFetch(!cached) // show loading only if no cached data at all
    }

    // Set up interval for ongoing refreshes
    const id = setInterval(() => doFetch(false), refreshInterval)

    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [url, enabled, refreshInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, lastUpdated }
}
