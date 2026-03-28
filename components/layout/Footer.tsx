import Link from 'next/link'
import MarketLensLogo from './MarketLensLogo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)] safe-bottom">
      <div className="mx-auto max-w-screen-2xl px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MarketLensLogo size={28} showWordmark={true} />
            </div>
            <p className="max-w-xs font-mono text-[10px] text-[var(--text-muted)]">
              Real-time prices, charts, news, and AI-powered sentiment for global markets.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-3 font-mono text-[11px]">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Markets</span>
              <Link href="/?tab=stock"     className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Stocks</Link>
              <Link href="/?tab=crypto"    className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Crypto</Link>
              <Link href="/?tab=forex"     className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Forex</Link>
              <Link href="/?tab=commodity" className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Commodities</Link>
              <Link href="/?tab=etf"       className="text-[var(--text-muted)] transition hover:text-[var(--text)]">ETFs</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Explore</span>
              <Link href="/news"   className="text-[var(--text-muted)] transition hover:text-[var(--text)]">News Hub</Link>
              <Link href="/search" className="text-[var(--text-muted)] transition hover:text-[var(--text)]">Search</Link>
            </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] text-[var(--text-muted)]" suppressHydrationWarning>
            © {year} MarketLens. Built by <span className="text-[var(--text-2)]">Kazem Julien Ammar</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <p className="max-w-md font-mono text-[10px] text-[var(--text-muted)] opacity-70">
              Not financial advice. Data provided for informational purposes only.
              Always do your own research before making investment decisions.
            </p>
            <a href="/social/daily" className="font-mono text-[9px] text-[var(--text-muted)] opacity-30 hover:opacity-60 transition-opacity">
              Social Brief
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
