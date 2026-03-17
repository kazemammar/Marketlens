'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import AuthModal from './AuthModal'

export default function UserMenu() {
  const { user, loading, signOut } = useAuth()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--surface-2)]" />
  }

  // ── Signed out ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          style={{ border: '1px solid var(--border)' }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" aria-hidden>
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M2.5 14c0-2.761 2.462-4.5 5.5-4.5s5.5 1.739 5.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Sign In
        </button>
        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  // ── Signed in ────────────────────────────────────────────────────────────
  const initial = user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={wrapRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={dropdownOpen}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:opacity-80"
        style={{
          background: 'rgba(16,185,129,0.15)',
          border:     '1px solid rgba(16,185,129,0.3)',
          boxShadow:  dropdownOpen ? '0 0 0 2px rgba(16,185,129,0.25)' : undefined,
        }}
      >
        <span className="font-mono text-[11px] font-bold text-emerald-400">
          {initial}
        </span>
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border)] shadow-2xl shadow-black/60"
          style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          {/* Email header */}
          <div className="border-b border-[var(--border)] px-3.5 py-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Signed in as
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text)]">
              {user.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link
              href="/watchlist"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 font-mono text-[11px] text-[var(--text)] transition-colors hover:bg-[var(--surface)]"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden>
                <path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5 8 2z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              My Watchlist
            </Link>

            <div className="mx-3 my-1 border-t border-[var(--border)]" />

            <button
              onClick={async () => { setDropdownOpen(false); await signOut() }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-red-400"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
