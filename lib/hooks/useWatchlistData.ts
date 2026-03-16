'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface WatchlistItem {
  id:         string
  symbol:     string
  asset_type: string
  added_at:   string
}

export function useWatchlist() {
  const { user } = useAuth()
  const [items,   setItems]   = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    if (!user) { setItems([]); return }
    setLoading(true)
    try {
      const res = await fetch('/api/watchlist')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const addToWatchlist = useCallback(async (symbol: string, assetType: string) => {
    if (!user) return false
    try {
      const res = await fetch('/api/watchlist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol, asset_type: assetType }),
      })
      if (res.ok) {
        await fetchWatchlist()
        return true
      }
    } catch { /* silent */ }
    return false
  }, [user, fetchWatchlist])

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!user) return false
    try {
      const res = await fetch('/api/watchlist', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol }),
      })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.symbol !== symbol))
        return true
      }
    } catch { /* silent */ }
    return false
  }, [user])

  const isInWatchlist = useCallback((symbol: string) => {
    return items.some((i) => i.symbol === symbol)
  }, [items])

  return { items, loading, addToWatchlist, removeFromWatchlist, isInWatchlist, refetch: fetchWatchlist }
}
