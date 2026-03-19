'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-center">
      {/* Icon */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.5} className="h-9 w-9" aria-hidden>
          <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 3v18M3 7l9 4 9-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 className="font-mono text-[18px] font-bold text-[var(--text)]">You&apos;re Offline</h1>
      <p className="mt-2 max-w-xs font-mono text-[11px] text-[var(--text-muted)]">
        MarketLens needs an internet connection to show live market data.
      </p>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] opacity-50">
        Check your connection and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-8 rounded px-6 py-2.5 font-mono text-[12px] font-semibold text-black transition-colors hover:opacity-90"
        style={{ background: 'var(--accent)' }}
      >
        Try Again
      </button>
    </div>
  )
}
