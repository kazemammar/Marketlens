import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      {/* Logo mark */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
        <svg viewBox="0 0 16 16" fill="none" className="h-9 w-9" aria-hidden>
          <polyline
            points="1,12 5,7 8,9 11,4 15,2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p className="font-mono text-5xl font-bold tabular-nums text-[var(--text)]">404</p>
      <h1 className="mt-3 font-mono text-[18px] font-semibold text-[var(--text)]">Page not found</h1>
      <p className="mt-2 max-w-sm font-mono text-[11px] text-[var(--text-muted)]">
        We couldn&rsquo;t find that page. The asset may not exist, or the URL might be incorrect.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-mono text-[12px] font-medium text-white transition hover:bg-blue-500"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/news"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 font-mono text-[12px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          Browse News
        </Link>
      </div>
    </div>
  )
}
