'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { createClient } from '@/lib/supabase/client'

export interface PortfolioPosition {
  id:         string
  symbol:     string
  asset_type: string
  direction:  'long' | 'short'
  quantity:   number | null
  avg_cost:   number | null
  notes:      string | null
  added_at:   string
  updated_at: string
}

export function usePortfolio() {
  const { user } = useAuth()
  const userId = user?.id

  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [loading,   setLoading]   = useState(false)

  const fetchPositions = useCallback(async () => {
    if (!userId) { setPositions([]); return }
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (createClient().from('portfolio_positions') as any)
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false })
      if (!error && data) setPositions(data as PortfolioPosition[])
    } catch { /* silent */ }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  const addPosition = useCallback(async (
    symbol:    string,
    assetType: string,
    direction: 'long' | 'short',
    quantity?: number | null,
    avgCost?:  number | null,
    notes?:    string | null,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (createClient().from('portfolio_positions') as any)
        .insert({
          user_id:    userId,
          symbol,
          asset_type: assetType,
          direction,
          quantity:   quantity ?? null,
          avg_cost:   avgCost  ?? null,
          notes:      notes    ?? null,
        })
      if (!error) {
        const now = new Date().toISOString()
        setPositions((prev) => [
          {
            id:         crypto.randomUUID(),
            symbol,
            asset_type: assetType,
            direction,
            quantity:   quantity ?? null,
            avg_cost:   avgCost  ?? null,
            notes:      notes    ?? null,
            added_at:   now,
            updated_at: now,
          },
          ...prev,
        ])
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  const updatePosition = useCallback(async (
    id:      string,
    updates: Partial<{ direction: 'long' | 'short'; quantity: number | null; avg_cost: number | null; notes: string | null }>,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (createClient().from('portfolio_positions') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
      if (!error) {
        setPositions((prev) =>
          prev.map((p) => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p)
        )
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  const removePosition = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (createClient().from('portfolio_positions') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (!error) {
        setPositions((prev) => prev.filter((p) => p.id !== id))
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  const hasPosition = useCallback((symbol: string, direction?: 'long' | 'short'): boolean => {
    if (direction) {
      return positions.some((p) => p.symbol === symbol && p.direction === direction)
    }
    return positions.some((p) => p.symbol === symbol)
  }, [positions])

  return { positions, loading, addPosition, updatePosition, removePosition, hasPosition, refetch: fetchPositions }
}
