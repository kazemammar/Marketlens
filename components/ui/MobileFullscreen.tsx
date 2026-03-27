'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'

/**
 * Wraps a panel with a mobile-only fullscreen toggle.
 * - Below `lg`: shows a small expand button; tapping it makes the panel
 *   fill the screen with a clip-path animation. A sticky header with
 *   a back button lets the user close it.
 * - At `lg`+: completely transparent — no button, no extra markup cost.
 */
export default function MobileFullscreen({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)

  const open = useCallback(() => {
    setExpanded(true)
    document.body.style.overflow = 'hidden'
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setExpanded(false)
      setClosing(false)
      document.body.style.overflow = ''
    }, 260)
  }, [])

  // Escape key closes fullscreen
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, close])

  // Auto-close if viewport becomes desktop
  useEffect(() => {
    if (!expanded) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => {
      if (mq.matches) { setExpanded(false); setClosing(false); document.body.style.overflow = '' }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [expanded])

  // ── Fullscreen view ──────────────────────────────────────────────────
  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col overflow-auto lg:relative lg:inset-auto lg:z-auto"
        style={{
          background: 'var(--bg)',
          animation: closing
            ? 'fsOut 0.26s cubic-bezier(0.4, 0, 1, 1) forwards'
            : 'fsIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 lg:hidden"
          style={{ background: 'var(--bg)' }}
        >
          <button
            onClick={close}
            className="flex items-center gap-1.5 rounded border border-[var(--border)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--text-muted)] transition-colors active:bg-[var(--surface-2)]"
          >
            <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5">
              <path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {title && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] truncate">
              {title}
            </span>
          )}

          <div className="flex-1" />

          <button
            onClick={close}
            className="flex items-center justify-center rounded border border-[var(--border)] p-1.5 transition-colors active:bg-[var(--surface-2)]"
            aria-label="Exit fullscreen"
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 text-[var(--text-muted)]">
              <path d="M5 1v4H1M13 1v4h-4M5 13V9H1M13 13V9h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-2">
          {children}
        </div>
      </div>
    )
  }

  // ── Normal view ──────────────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Expand button — mobile only */}
      <button
        onClick={open}
        className="absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded-md border border-white/[0.08] bg-black/30 p-1 backdrop-blur-sm transition-all active:scale-90 lg:hidden"
        aria-label="View fullscreen"
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5 text-white/40">
          <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {children}
    </div>
  )
}
