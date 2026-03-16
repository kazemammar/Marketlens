'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import CommandPalette from './CommandPalette'

const NAV_LINKS = [
  { label: 'Stocks',      href: '/?tab=stock'     },
  { label: 'Crypto',      href: '/?tab=crypto'    },
  { label: 'Forex',       href: '/?tab=forex'     },
  { label: 'Commodities', href: '/?tab=commodity' },
  { label: 'ETFs',        href: '/?tab=etf'       },
  { label: 'News',        href: '/news'            },
  { label: 'Econ',        href: '/economics'       },
]

function NavLinks() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const activeHref   = pathname === '/'
    ? `/?tab=${searchParams.get('tab') ?? 'stock'}`
    : pathname

  function handleNavClick() {
    if (pathname === '/') {
      setTimeout(() => {
        document.getElementById('market-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  return (
    <nav className="hidden items-center gap-0 lg:flex ml-4" aria-label="Main navigation">
      {NAV_LINKS.map(({ label, href }) => {
        const isActive = href === activeHref
        return (
          <Link
            key={href}
            href={href}
            onClick={handleNavClick}
            className={`relative px-3 py-1.5 font-mono text-[10px] font-medium tracking-wide transition-colors duration-150 ${
              isActive ? 'nav-link-active' : 'text-[var(--text-muted)] hover:text-[var(--text-2)]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function NavLinksFallback() {
  return (
    <nav className="hidden items-center gap-0 lg:flex ml-4">
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className="px-3 py-1.5 font-mono text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-2)]"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}

export default function Navbar() {
  const { toggle } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K shortcut
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
      className="sticky top-0 z-50 w-full border-b"
      style={{
        height: '44px',
        background: 'rgba(9,9,11,0.88)',
        borderColor: 'rgba(39,39,42,0.8)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      }}
    >
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 select-none" aria-label="MarketLens home">
          {/* Icon */}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.3)',
              boxShadow: '0 0 12px rgba(16,185,129,0.2)',
            }}
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
              <polyline points="1,11 4,7 7,8.5 10,4 13,2" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Wordmark */}
          <span
            className="hidden font-semibold sm:block"
            style={{ fontSize: 13, letterSpacing: '-0.02em' }}
          >
            <span style={{ color: '#fafafa' }}>Market</span>
            <span style={{ color: '#10b981', textShadow: '0 0 12px rgba(16,185,129,0.4)' }}>Lens</span>
          </span>
          {/* LIVE dot */}
          <div className="flex items-center gap-1">
            <span
              className="live-dot h-1.5 w-1.5 rounded-full"
              style={{ background: '#10b981' }}
            />
            <span className="font-mono text-[8px] font-semibold tracking-[0.15em]" style={{ color: '#10b981' }}>
              LIVE
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>

        <div className="flex-1" />

        {/* ⌘K Search trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="Search (⌘K)"
          className="flex h-8 items-center gap-2 rounded-md px-2.5 font-mono text-[10px] transition-colors hover:bg-[var(--surface-2)]"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="hidden sm:block text-[10px]">Search</span>
          <kbd
            className="hidden sm:flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface-2)]"
          style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
          </svg>
        </button>
      </div>
    </header>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
