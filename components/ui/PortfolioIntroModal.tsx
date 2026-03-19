'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ml_portfolio_intro_v1'

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1,12 5,7 9,10 15,3" />
        <polyline points="11,3 15,3 15,7" />
      </svg>
    ),
    label: 'Live P&L',
    desc: 'Real-time gains and losses across every position — long and short, stocks to crypto.',
    color: 'var(--price-up)',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1a5 5 0 0 1 5 5c0 3-5 9-5 9S3 9 3 6a5 5 0 0 1 5-5z" />
        <circle cx="8" cy="6" r="1.5" />
      </svg>
    ),
    label: 'AI Portfolio Brief',
    desc: 'Daily intelligence on your exact holdings — risks, opportunities, and context.',
    color: 'var(--accent)',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="2.5" />
        <line x1="8" y1="1" x2="8" y2="2.5" strokeWidth="2" />
      </svg>
    ),
    label: 'Risk & Exposure',
    desc: 'Concentration alerts, sector allocation, and cross-asset exposure in one view.',
    color: 'var(--warning)',
  },
  {
    icon: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 12 L5 6 L9 8 L15 2" />
        <path d="M1 12 L15 12" strokeOpacity="0.4" />
        <path d="M1 2 L1 12" strokeOpacity="0.4" />
      </svg>
    ),
    label: 'Benchmark',
    desc: 'Track your alpha against S&P 500 — know if you\'re actually beating the market.',
    color: '#3b82f6',
  },
]

export default function PortfolioIntroModal() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch { /* SSR / private mode */ }

    // Delay so the page loads first
    const t = setTimeout(() => setVisible(true), 1400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [visible])

  function dismiss() {
    setClosing(true)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* */ }
    setTimeout(() => { setVisible(false); setClosing(false) }, 280)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        animation: closing ? 'fadeOutBackdrop 0.28s ease forwards' : 'fadeInBackdrop 0.3s ease forwards',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="relative w-full max-w-[540px] overflow-hidden border border-[var(--border)]"
        style={{
          background: 'var(--bg)',
          boxShadow: '0 0 0 1px var(--accent-dim), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(5,150,105,0.08)',
          animation: closing ? 'modalOut 0.28s cubic-bezier(0.4,0,1,1) forwards' : 'modalIn 0.38s cubic-bezier(0.16,1,0.3,1) forwards',
        }}
      >
        {/* Accent top border */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-dim), transparent)' }} />

        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }}
            />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
              Portfolio Intelligence
            </span>
            <span
              className="rounded-sm px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em]"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              New
            </span>
          </div>
          <button
            onClick={dismiss}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div className="px-4 pb-5 pt-5 sm:px-6">

          {/* Headline */}
          <h2 className="font-mono text-[20px] font-bold leading-[1.15] tracking-tight text-white sm:text-[24px]">
            What if you knew, <span style={{ color: 'var(--accent)' }}>exactly,</span> where your portfolio stood?
          </h2>

          <p className="mt-3 font-mono text-[10px] leading-[1.7] text-[var(--text-muted)] sm:text-[11px]">
            Add your positions — stocks, crypto, commodities, and more — and
            MarketLens turns them into a{' '}
            <span className="text-[var(--text)]">live intelligence dashboard.</span>{' '}
            Real P&L updated in real time, AI analysis of your exact holdings,
            and risk signals that actually tell you something.
          </p>
          <p className="mt-2 font-mono text-[10px] leading-[1.7] text-[var(--text-muted)] sm:text-[11px]">
            We&apos;re shipping new features every week.
          </p>

          {/* Feature grid */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-3"
                style={{ borderLeftColor: f.color, borderLeftWidth: '2px' }}
              >
                <div className="flex items-center gap-2" style={{ color: f.color }}>
                  {f.icon}
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: f.color }}>
                    {f.label}
                  </span>
                </div>
                <p className="font-mono text-[9px] leading-[1.6] text-[var(--text-muted)]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mt-5 h-px w-full bg-[var(--border)]" />

          {/* CTAs */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href="/portfolio"
              onClick={dismiss}
              className="flex w-full items-center justify-center gap-2 border border-[var(--accent)] bg-[var(--accent-dim)] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--accent)] transition-all hover:bg-[var(--accent)] hover:text-black sm:flex-1 sm:py-2.5"
              style={{ boxShadow: '0 0 20px var(--accent-glow)' }}
            >
              Build Your Portfolio
              <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="6" x2="11" y2="6" />
                <polyline points="7,2 11,6 7,10" />
              </svg>
            </Link>
            <button
              onClick={dismiss}
              className="w-full py-2.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] sm:w-auto sm:px-4"
            >
              Maybe later
            </button>
          </div>

          {/* Reassurance */}
          <p className="mt-3 font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            Free to use · Sign in with Google · No credit card required
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInBackdrop  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOutBackdrop { from { opacity: 1 } to { opacity: 0 } }
        @keyframes modalIn  { from { opacity: 0; transform: scale(0.96) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes modalOut { from { opacity: 1; transform: scale(1) translateY(0) } to { opacity: 0; transform: scale(0.96) translateY(8px) } }
      `}</style>
    </div>
  )
}
