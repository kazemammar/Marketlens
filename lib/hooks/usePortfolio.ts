'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioLot {
  id:        string
  date:      string    // "2025-01-15"
  quantity:  number
  price:     number    // price per share/unit
  amount:    number    // total invested (quantity * price)
  note?:     string
  createdAt: string
}

export interface PortfolioPosition {
  id:            string
  symbol:        string
  asset_type:    string
  direction:     'long' | 'short'
  quantity:      number | null
  avg_cost:      number | null
  notes:         string | null
  lots:          PortfolioLot[]
  purchase_date: string | null
  added_at:      string
  updated_at:    string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const { user } = useAuth()
  const userId = user?.id

  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [loading,   setLoading]   = useState(false)

  const fetchPositions = useCallback(async () => {
    if (!userId) { setPositions([]); return }
    setLoading(true)
    try {
      const { data, error } = await createClient().from('portfolio_positions')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false })
      if (!error && data) {
        // Ensure lots is always an array (handles rows created before the column was added)
        setPositions((data as PortfolioPosition[]).map((p) => ({ ...p, lots: p.lots ?? [] })))
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  // ── Add new position ────────────────────────────────────────────────────────

  const addPosition = useCallback(async (
    symbol:        string,
    assetType:     string,
    direction:     'long' | 'short',
    quantity?:     number | null,
    avgCost?:      number | null,
    notes?:        string | null,
    lots?:         PortfolioLot[] | null,
    purchaseDate?: string | null,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      const { error } = await createClient().from('portfolio_positions')
        .insert({
          user_id:       userId,
          symbol,
          asset_type:    assetType,
          direction,
          quantity:      quantity      ?? null,
          avg_cost:      avgCost       ?? null,
          notes:         notes         ?? null,
          lots:          lots          ?? [],
          purchase_date: purchaseDate  ?? null,
        })
      if (!error) {
        const now = new Date().toISOString()
        setPositions((prev) => [
          {
            id:            crypto.randomUUID(),
            symbol,
            asset_type:    assetType,
            direction,
            quantity:      quantity      ?? null,
            avg_cost:      avgCost       ?? null,
            notes:         notes         ?? null,
            lots:          lots          ?? [],
            purchase_date: purchaseDate  ?? null,
            added_at:      now,
            updated_at:    now,
          },
          ...prev,
        ])
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId])

  // ── Update position ─────────────────────────────────────────────────────────

  const updatePosition = useCallback(async (
    id:      string,
    updates: Partial<{
      direction:     'long' | 'short'
      quantity:      number | null
      avg_cost:      number | null
      notes:         string | null
      lots:          PortfolioLot[]
      purchase_date: string | null
    }>,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      const { error } = await createClient().from('portfolio_positions')
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

  // ── Add lot to existing position ────────────────────────────────────────────

  const addLotToPosition = useCallback(async (
    positionId: string,
    lot:        PortfolioLot,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      const position = positions.find((p) => p.id === positionId)
      if (!position) return false

      const newLots    = [...(position.lots ?? []), lot]
      const totalQty   = newLots.reduce((sum, l) => sum + l.quantity, 0)
      const totalAmt   = newLots.reduce((sum, l) => sum + l.amount,   0)
      const avgCost    = totalQty > 0 ? totalAmt / totalQty : 0

      const patch = {
        lots:       newLots,
        quantity:   totalQty,
        avg_cost:   Math.round(avgCost * 100) / 100,
        updated_at: new Date().toISOString(),
      }

      const { error } = await createClient().from('portfolio_positions')
        .update(patch)
        .eq('id', positionId)
        .eq('user_id', userId)

      if (!error) {
        setPositions((prev) =>
          prev.map((p) => p.id === positionId ? { ...p, ...patch } : p)
        )
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId, positions])

  // ── Remove lot from position ────────────────────────────────────────────────

  const removeLot = useCallback(async (
    positionId: string,
    lotId:      string,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      const position = positions.find((p) => p.id === positionId)
      if (!position) return false

      const newLots  = (position.lots ?? []).filter((l) => l.id !== lotId)
      const totalQty = newLots.reduce((sum, l) => sum + l.quantity, 0)
      const totalAmt = newLots.reduce((sum, l) => sum + l.amount,   0)
      const avgCost  = totalQty > 0 ? totalAmt / totalQty : 0

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: any = {
        lots:       newLots,
        quantity:   newLots.length > 0 ? totalQty             : null,
        avg_cost:   newLots.length > 0 ? Math.round(avgCost * 100) / 100 : null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await createClient().from('portfolio_positions')
        .update(patch)
        .eq('id', positionId)
        .eq('user_id', userId)

      if (!error) {
        setPositions((prev) =>
          prev.map((p) => p.id === positionId ? { ...p, ...patch } : p)
        )
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId, positions])

  // ── Update lot in position ──────────────────────────────────────────────────

  const updateLot = useCallback(async (
    positionId: string,
    updatedLot: PortfolioLot,
  ): Promise<boolean> => {
    if (!userId) return false
    try {
      const position = positions.find((p) => p.id === positionId)
      if (!position) return false

      const newLots  = (position.lots ?? []).map((l) => l.id === updatedLot.id ? updatedLot : l)
      const totalQty = newLots.reduce((sum, l) => sum + l.quantity, 0)
      const totalAmt = newLots.reduce((sum, l) => sum + l.amount,   0)
      const avgCost  = totalQty > 0 ? totalAmt / totalQty : 0

      const patch = {
        lots:       newLots,
        quantity:   totalQty,
        avg_cost:   Math.round(avgCost * 100) / 100,
        updated_at: new Date().toISOString(),
      }

      const { error } = await createClient().from('portfolio_positions')
        .update(patch)
        .eq('id', positionId)
        .eq('user_id', userId)

      if (!error) {
        setPositions((prev) =>
          prev.map((p) => p.id === positionId ? { ...p, ...patch } : p)
        )
        return true
      }
    } catch { /* silent */ }
    return false
  }, [userId, positions])

  // ── Remove position ─────────────────────────────────────────────────────────

  const removePosition = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false
    try {
      const { error } = await createClient().from('portfolio_positions')
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

  // ── Predicate ───────────────────────────────────────────────────────────────

  const hasPosition = useCallback((symbol: string, direction?: 'long' | 'short'): boolean => {
    if (direction) {
      return positions.some((p) => p.symbol === symbol && p.direction === direction)
    }
    return positions.some((p) => p.symbol === symbol)
  }, [positions])

  return {
    positions,
    loading,
    addPosition,
    updatePosition,
    addLotToPosition,
    removeLot,
    updateLot,
    removePosition,
    hasPosition,
    refetch: fetchPositions,
  }
}
