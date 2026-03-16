'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const supabase  = useMemo(() => createClient(), [])
  const [items,   setItems]   = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    if (!user) { setItems([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false })
      if (!error && data) setItems(data as WatchlistItem[])
    } catch { /* silent */ }
    setLoading(false)
  }, [user, supabase])

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const addToWatchlist = useCallback(async (symbol: string, assetType: string) => {
    if (!user) return false
    try {
      const { error } = await supabase
        .from('watchlists')
        .insert({ user_id: user.id, symbol, asset_type: assetType })
      if (!error) {
        setItems((prev) => [
          { id: crypto.randomUUID(), symbol, asset_type: assetType, added_at: new Date().toISOString() },
          ...prev,
        ])
        return true
      }
    } catch { /* silent */ }
    return false
  }, [user, supabase])

  const removeFromWatchlist = useCallback(async (symbol: string) => {
    if (!user) return false
    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol)
      if (!error) {
        setItems((prev) => prev.filter((i) => i.symbol !== symbol))
        return true
      }
    } catch { /* silent */ }
    return false
  }, [user, supabase])

  const isInWatchlist = useCallback((symbol: string) => {
    return items.some((i) => i.symbol === symbol)
  }, [items])

  return { items, loading, addToWatchlist, removeFromWatchlist, isInWatchlist, refetch: fetchWatchlist }
}
