'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useWatchlist } from '@/lib/hooks/useWatchlistData'
import AuthModal from '@/components/auth/AuthModal'
import type { AssetType } from '@/lib/utils/types'

export default function WatchlistButton({
  symbol,
  type,
}: {
  symbol: string
  type:   AssetType
}) {
  const { user }                                = useAuth()
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist()
  const [modalOpen, setModalOpen] = useState(false)
  const [busy,      setBusy]      = useState(false)

  const watched = isInWatchlist(symbol)

  async function handleClick() {
    if (!user) {
      setModalOpen(true)
      return
    }
    setBusy(true)
    if (watched) {
      await removeFromWatchlist(symbol)
    } else {
      await addToWatchlist(symbol, type)
    }
    setBusy(false)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[10px] font-semibold transition-all disabled:opacity-50 ${
          watched
            ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]'
        }`}
      >
        {busy ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        ) : (
          <svg
            viewBox="0 0 16 16" fill={watched ? 'currentColor' : 'none'}
            className="h-3 w-3 shrink-0" aria-hidden
          >
            <path
              d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
            />
          </svg>
        )}
        {watched ? 'Watching' : 'Watch'}
      </button>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
