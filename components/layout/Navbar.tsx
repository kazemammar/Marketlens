'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import CommandPalette from './CommandPalette'
import UserMenu from '@/components/auth/UserMenu'
import MarketLensLogo from './MarketLensLogo'

const NAV_LINKS = [
  { label: 'Dashboard',   href: '/'            },
  { label: 'Movers',      href: '/movers'      },
  { label: 'Stocks',      href: '/stocks'      },
  { label: 'Crypto',      href: '/crypto'      },
  { label: 'Forex',       href: '/forex'       },
  { label: 'Commodities', href: '/commodities' },
  { label: 'ETFs',        href: '/etf'         },
  { label: 'News',        href: '/news'        },
  { label: 'Econ',        href: '/economics'   },
]

// ─── Nav link ──────────────────────────────────────────────────────────────────

function NavLink({ label, href, isActive }: { label: string; href: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={`relative flex h-8 items-center px-3 text-[11px] font-medium tracking-wide transition-colors duration-150 ${
        isActive
          ? 'text-[var(--accent)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-2)]'
      }`}
    >
      {label}
      {/* Active underline bar */}
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }}
        />
      )}
    </Link>
  )
}

function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center lg:flex" aria-label="Main navigation">
      {NAV_LINKS.map(({ label, href }) => (
        <NavLink
          key={href}
          label={label}
          href={href}
          isActive={pathname === href || (href !== '/' && pathname.startsWith(href))}
        />
      ))}
    </nav>
  )
}

function NavLinksFallback() {
  return (
    <nav className="hidden items-center lg:flex">
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className="flex h-8 items-center rounded px-3 text-[11px] font-medium tracking-wide text-[var(--text-muted)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

// ─── Right nav buttons (Portfolio + Watchlist) ─────────────────────────────────

function RightNavButtons() {
  const pathname = usePathname()
  const isPortfolio = pathname === '/portfolio'
  const isWatchlist = pathname === '/watchlist'

  return (
    <div className="hidden lg:flex items-center gap-2">
      {/* Portfolio — prominent green button */}
      <Link
        href="/portfolio"
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-semibold tracking-wide transition-all duration-150 hover:opacity-90 ${
          isPortfolio ? 'ring-1 ring-white/20' : ''
        }`}
        style={{
          background: 'var(--accent)',
          color: '#ffffff',
          boxShadow: isPortfolio
            ? '0 0 16px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 0 10px rgba(16,185,129,0.15)',
        }}
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
          <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <polyline points="1,8 4,6 7,8 10,4 13,5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Portfolio
      </Link>

      {/* Watchlist — subtle, muted design */}
      <Link
        href="/watchlist"
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-medium tracking-wide transition-all duration-150 ${
          isWatchlist
            ? 'text-[var(--accent)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        }`}
        style={{
          border: `1px solid ${isWatchlist ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
          background: isWatchlist ? 'rgba(16,185,129,0.08)' : 'transparent',
        }}
      >
        <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
          <path d="M7 1l1.8 3.7 4 .6-2.9 2.8.7 4L7 10.4 3.4 12.1l.7-4-2.9-2.8 4-.6L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
        Watchlist
      </Link>
    </div>
  )
}

// ─── Mobile menu ──────────────────────────────────────────────────────────────

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  return (
    <div
      className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
      }`}
      style={{
        background: 'var(--bg)',
        borderBottom: open ? '1px solid var(--border)' : 'none',
      }}
    >
      {/* Portfolio + Watchlist — prominent mobile buttons */}
      <div className="flex gap-2 px-3 pt-3 pb-1">
        <Link
          href="/portfolio"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-1.5 rounded py-3 font-mono text-[10px] font-semibold tracking-wide text-white transition-colors"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
            <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            <polyline points="1,8 4,6 7,8 10,4 13,5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Portfolio
        </Link>
        <Link
          href="/watchlist"
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[var(--border)] py-3 font-mono text-[11px] font-medium tracking-wide text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
            <path d="M7 1l1.8 3.7 4 .6-2.9 2.8.7 4L7 10.4 3.4 12.1l.7-4-2.9-2.8 4-.6L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          Watchlist
        </Link>
      </div>

      {/* Grouped nav */}
      <nav className="p-3 space-y-2">
        {/* Markets */}
        <div>
          <span className="block px-1 pb-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
            Markets
          </span>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {NAV_LINKS.filter(l => ['Dashboard','Stocks','Crypto','Forex','Commodities','ETFs','Movers'].includes(l.label)).map(({ label, href }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex min-h-[44px] items-center justify-center rounded py-3 text-[11px] font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-2)]'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        {/* Intelligence */}
        <div>
          <span className="block px-1 pb-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
            Intelligence
          </span>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {NAV_LINKS.filter(l => ['News','Econ'].includes(l.label)).map(({ label, href }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex min-h-[44px] items-center justify-center rounded py-3 text-[11px] font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-2)]'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="px-3 pb-3 pt-1">
        <p className="text-center font-mono text-[10px] tracking-wide text-[var(--text-muted)] opacity-60">
          by Kazem Julien Ammar
        </p>
      </div>
    </div>
  )
}

// ─── Main navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const [paletteOpen,  setPaletteOpen]  = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)

  // ⌘K shortcut
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-[200] w-full safe-top"
        style={{
          background:           'var(--bg)',
          borderBottom:         '1px solid var(--border)',
          boxShadow:            '0 1px 0 rgba(16,185,129,0.06), 0 4px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex h-[52px] items-center gap-3 px-3 sm:px-4">

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <MarketLensLogo size={36} showWordmark={true} />

          {/* ── Byline ───────────────────────────────────────────────── */}
          <span className="hidden lg:block text-[10px] font-medium tracking-wide" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            by Kazem Julien Ammar
          </span>

          {/* ── Separator ────────────────────────────────────────────── */}
          <div className="hidden lg:block h-5 w-px shrink-0" style={{ background: 'var(--border)' }} />

          {/* ── Nav links ────────────────────────────────────────────── */}
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>

          <div className="flex-1" />

          {/* ── Right action group ───────────────────────────────────── */}

          {/* Portfolio + Watchlist buttons */}
          <Suspense fallback={<div className="hidden lg:flex items-center gap-2" />}>
            <RightNavButtons />
          </Suspense>

          {/* Thin separator before search */}
          <div className="hidden lg:block h-5 w-px shrink-0" style={{ background: 'var(--border)' }} />

          {/* Search pill */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (⌘K)"
            className="group flex h-8 items-center gap-2 rounded px-3 font-mono text-[10px] transition-all duration-150 hover:bg-white/[0.06]"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--text-2)]" aria-hidden>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="hidden sm:block">Search</span>
            <kbd
              className="hidden sm:flex items-center rounded px-1 py-px text-[9px] font-mono"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Thin separator before icon buttons */}
          <div className="h-5 w-px shrink-0" style={{ background: 'var(--border)' }} />

          {/* User menu */}
          <UserMenu />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded transition-all duration-150 hover:bg-white/[0.06]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden>
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden>
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
              </svg>
            )}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-8 w-8 items-center justify-center rounded transition-all duration-150 hover:bg-white/[0.06] lg:hidden"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round"/>
                  <line x1="3" y1="12" x2="21" y2="12" strokeLinecap="round"/>
                  <line x1="3" y1="18" x2="21" y2="18" strokeLinecap="round"/>
                </>
              )}
            </svg>
          </button>

        </div>

        {/* Mobile menu */}
        <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </header>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
