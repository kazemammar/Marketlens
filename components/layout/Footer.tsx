import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                  <polyline
                    points="1,12 5,7 8,9 11,4 15,2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-semibold tracking-tight text-[var(--text)]">
                Market<span style={{ color: '#10b981' }}>Lens</span>
              </span>
            </div>
            <p className="max-w-xs text-xs text-[var(--text-muted)]">
              Real-time prices, charts, news, and AI-powered sentiment for global markets.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-3 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Markets</span>
              <Link href="/?tab=stock"     className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Stocks</Link>
              <Link href="/?tab=crypto"    className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Crypto</Link>
              <Link href="/?tab=forex"     className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Forex</Link>
              <Link href="/?tab=commodity" className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Commodities</Link>
              <Link href="/?tab=etf"       className="text-[var(--text-muted)] transition hover:text-[var(--text)]">ETFs</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Explore</span>
              <Link href="/news"   className="text-[var(--text-muted)] transition hover:text-[var(--text)]">News Hub</Link>
              <Link href="/search" className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Search</Link>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            © {year} MarketLens. Built by <span className="text-[var(--text-2)]">Kazem Julien Ammar</span>. All rights reserved.
          </p>
          <p className="max-w-md text-xs text-[var(--text-muted)] opacity-70">
            Not financial advice. Data provided for informational purposes only.
            Always do your own research before making investment decisions.
          </p>
        </div>
      </div>
    </footer>
  )
}
