import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo mark */}
      <div className="mb-6">
        <svg width={56} height={48} viewBox="0 0 56 48" fill="#22c55e" aria-hidden>
          <path d="M28,0 L56,14 L28,28 L0,14 Z" />
          <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" opacity="0.4" />
        </svg>
      </div>

      <p className="font-mono text-5xl font-bold tabular-nums text-[var(--text)]">404</p>
      <h1 className="mt-3 font-mono text-[18px] font-semibold text-[var(--text)]">Page not found</h1>
      <p className="mt-2 max-w-sm font-mono text-[10px] text-[var(--text-muted)]">
        We couldn&rsquo;t find that page. The asset may not exist, or the URL might be incorrect.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded px-5 py-2.5 font-mono text-[12px] font-medium text-black transition hover:opacity-90"
          style={{ background: 'var(--accent)' }}
        >
          Back to Dashboard
        </Link>
        <Link
          href="/news"
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-mono text-[12px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          Browse News
        </Link>
      </div>
    </div>
  )
}
