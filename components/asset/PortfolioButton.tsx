'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePortfolio } from '@/lib/hooks/usePortfolio'
import AuthModal from '@/components/auth/AuthModal'
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

  const [modalOpen,  setModalOpen]  = useState(false)
  const [popOpen,    setPopOpen]    = useState(false)
  const [direction,  setDirection]  = useState<'long' | 'short'>('long')
  const [busy,       setBusy]       = useState(false)
  const [justAdded,  setJustAdded]  = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  const inPortfolio = hasPosition(symbol)

  // Close popover on outside click
  useEffect(() => {
    if (!popOpen) return
    function onMouseDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setPopOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [popOpen])

  // Close popover on Escape
  useEffect(() => {
    if (!popOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popOpen])

  async function handleAdd() {
    setBusy(true)
    const ok = await addPosition(symbol, type, direction)
    setBusy(false)
    if (ok) {
      setPopOpen(false)
      setJustAdded(true)
      setTimeout(() => setJustAdded(false), 2000)
    }
  }

  function handleClick() {
    if (inPortfolio || justAdded) {
      router.push('/portfolio')
      return
    }
    if (!user) {
      setModalOpen(true)
      return
    }
    setPopOpen((o) => !o)
  }

  const active = inPortfolio || justAdded

  return (
    <>
      <div ref={popRef} className="relative">
        <button
          onClick={handleClick}
          aria-label={active ? 'Go to portfolio' : 'Add to portfolio'}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${
            active
              ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]'
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

        {/* Direction popover */}
        {popOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-[200px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl shadow-black/50">
            <p className="mb-2 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Direction</p>

            {/* Long / Short toggle */}
            <div className="mb-3 flex gap-1.5">
              <button
                onClick={() => setDirection('long')}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 font-mono text-[11px] font-semibold transition-all ${
                  direction === 'long'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/30 hover:text-emerald-400'
                }`}
              >
                <span>▲</span> Long
              </button>
              <button
                onClick={() => setDirection('short')}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 font-mono text-[11px] font-semibold transition-all ${
                  direction === 'short'
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                    : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-red-500/30 hover:text-red-400'
                }`}
              >
                <span>▼</span> Short
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={busy}
              className="w-full rounded-md py-1.5 font-mono text-[11px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              {busy ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  Adding…
                </span>
              ) : (
                'Add to Portfolio'
              )}
            </button>
          </div>
        )}
      </div>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
