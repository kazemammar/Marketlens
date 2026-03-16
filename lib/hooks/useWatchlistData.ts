'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { createClient } from '@/lib/supabase/client'

export interface WatchlistItem {
  id:         string
  symbol:     string
  asset_type: string
  added_at:   string
}

export function useWatchlist() {
  const { user } = useAuth()
  const userId = user?.id  // stable string, not the whole user object

  const [items,   setItems]   = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    if (!userId) { setItems([]); return }
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (createClient().from('watchlists') as any)
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false })
      if (!error && data) setItems(data as WatchlistItem[])
    } catch { /* silent */ }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const addToWatchlist = useCallback(async (symbol: string, assetType: string) => {
    if (!userId) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (createClient().from('watchlists') as any)
        .insert({ user_id: userId, symbol, asset_type: assetType })
      if (!error) {
        setItems((prev) => [
          { id: crypto.randomUUID(), symbol, asset_type: assetType, added_at: new Date().toISOString() },
          ...prev,
        ])
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!userId) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (createClient().from('watchlists') as any)
        .delete()
        .eq('user_id', userId)
        .eq('symbol', symbol)
      if (!error) {
        setItems((prev) => prev.filter((i) => i.symbol !== symbol))
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  const isInWatchlist = useCallback((symbol: string) => {
    return items.some((i) => i.symbol === symbol)
  }, [items])

  return { items, loading, addToWatchlist, removeFromWatchlist, isInWatchlist, refetch: fetchWatchlist }
}
