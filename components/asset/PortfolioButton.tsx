'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePortfolio } from '@/lib/hooks/usePortfolio'
import AuthModal from '@/components/auth/AuthModal'
import AddPositionModal from '@/components/portfolio/AddPositionModal'
import type { AssetType } from '@/lib/utils/types'

export default function PortfolioButton({
  symbol,
  type,
}: {
  symbol: string
  type:   AssetType
}) {
  const { user }                    = useAuth()
  const { hasPosition, addPosition } = usePortfolio()
  const router                      = useRouter()

  const [authOpen,   setAuthOpen]   = useState(false)
  const [addOpen,    setAddOpen]    = useState(false)
  const [justAdded,  setJustAdded]  = useState(false)

  const inPortfolio = hasPosition(symbol)

  function handleClick() {
    if (inPortfolio || justAdded) {
      router.push('/portfolio')
      return
    }
    if (!user) {
      setAuthOpen(true)
      return
    }
    setAddOpen(true)
  }

  const active = inPortfolio || justAdded

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={active ? 'Go to portfolio' : 'Add to portfolio'}
        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[10px] font-semibold transition-all ${
          active
            ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]'
        }`}
      >
        {justAdded ? (
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0" aria-hidden>
            <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0" aria-hidden>
            <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <polyline points="1,8 4,6 7,8 10,4 13,5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {justAdded ? 'Added!' : active ? 'In Portfolio' : '+ Portfolio'}
      </button>

      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      <AddPositionModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={async (data) => {
          const ok = await addPosition(data.symbol, data.assetType, data.direction, data.quantity, data.avgCost, data.notes)
          if (ok) {
            setJustAdded(true)
            setTimeout(() => setJustAdded(false), 2000)
          }
          return ok
        }}
        prefill={{ symbol, type }}
      />
    </>
  )
}
