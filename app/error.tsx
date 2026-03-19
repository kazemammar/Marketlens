'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo mark */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded bg-red-500/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-red-500" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <p className="font-mono text-5xl font-bold text-[var(--text)]">Oops</p>
      <h1 className="mt-3 font-mono text-[18px] font-semibold text-[var(--text)]">Something went wrong</h1>
      <p className="mt-2 max-w-sm font-mono text-[10px] text-[var(--text-muted)]">
        An unexpected error occurred. This is usually a temporary issue — try again in a moment.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded px-5 py-2.5 font-mono text-[12px] font-medium text-black transition hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-mono text-[12px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
