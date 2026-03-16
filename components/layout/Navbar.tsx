'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import CommandPalette from './CommandPalette'
import UserMenu from '@/components/auth/UserMenu'

const NAV_LINKS = [
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
          ? 'text-[#10b981]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-2)]'
      }`}
    >
      {label}
      {/* Active underline bar */}
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
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
          className="flex h-8 items-center rounded-md px-3 text-[11px] font-medium tracking-wide text-[var(--text-muted)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

// ─── Mobile menu ──────────────────────────────────────────────────────────────

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  return (
    <div
      className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
      }`}
      style={{
        background: 'rgba(9,9,11,0.97)',
        borderBottom: open ? '1px solid rgba(39,39,42,0.8)' : 'none',
      }}
    >
      <nav className="grid grid-cols-2 gap-1 p-3 sm:grid-cols-4">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center justify-center rounded-lg py-3 text-[11px] font-medium tracking-wide transition-colors ${
                isActive
                  ? 'bg-[rgba(16,185,129,0.08)] text-[#10b981]'
                  : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-2)]'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
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
        className="sticky top-0 z-50 w-full"
        style={{
          background: 'rgba(9,9,11,0.90)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid rgba(39,39,42,0.7)',
          boxShadow: '0 1px 0 rgba(16,185,129,0.06), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex h-[52px] items-center gap-3 px-3 sm:px-4">

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 select-none"
            aria-label="MarketLens home"
          >
            {/* Icon with glow */}
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: 'rgba(16,185,129,0.12)',
                border: '1px solid rgba(16,185,129,0.28)',
                boxShadow: '0 0 16px rgba(16,185,129,0.2), inset 0 1px 0 rgba(16,185,129,0.15)',
              }}
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <polyline
                  points="1,11 4,7 7,8.5 10,4 13,2"
                  stroke="#10b981"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Wordmark */}
            <span className="hidden sm:flex items-baseline gap-0" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em' }}>
              <span style={{ color: '#fafafa' }}>Market</span>
              <span style={{ color: '#10b981', textShadow: '0 0 16px rgba(16,185,129,0.5)' }}>Lens</span>
            </span>

            {/* LIVE pill */}
            <span
              className="hidden sm:flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-[0.18em]"
              style={{
                background: 'rgba(16,185,129,0.10)',
                border: '1px solid rgba(16,185,129,0.22)',
                color: '#10b981',
              }}
            >
              <span className="live-dot h-1 w-1 rounded-full" style={{ background: '#10b981' }} />
              LIVE
            </span>
          </Link>

          {/* ── Separator ────────────────────────────────────────────── */}
          <div className="hidden lg:block h-5 w-px shrink-0" style={{ background: 'rgba(63,63,70,0.6)' }} />

          {/* ── Nav links ────────────────────────────────────────────── */}
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>

          <div className="flex-1" />

          {/* ── Right action group ───────────────────────────────────── */}

          {/* Search pill */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (⌘K)"
            className="group flex h-8 items-center gap-2 rounded-lg px-3 font-mono text-[10px] transition-all duration-150 hover:bg-white/[0.06]"
            style={{
              border: '1px solid rgba(63,63,70,0.6)',
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
                background: 'rgba(39,39,42,0.8)',
                border: '1px solid rgba(63,63,70,0.6)',
                color: 'var(--text-muted)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Thin separator before icon buttons */}
          <div className="h-5 w-px shrink-0" style={{ background: 'rgba(63,63,70,0.5)' }} />

          {/* User menu */}
          <UserMenu />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/[0.06]"
            style={{ border: '1px solid rgba(63,63,70,0.6)', color: 'var(--text-muted)' }}
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
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/[0.06] lg:hidden"
            style={{ border: '1px solid rgba(63,63,70,0.6)', color: 'var(--text-muted)' }}
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
