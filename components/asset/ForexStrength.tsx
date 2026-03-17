'use client'

import { useEffect, useState } from 'react'

// ─── Pair metadata ────────────────────────────────────────────────────────

const PAIR_INFO: Record<string, { fullName: string; classification: string; description: string }> = {
  'EUR/USD': { fullName: 'Euro / US Dollar',            classification: 'Major',  description: 'Most traded pair globally. ~24% of daily forex volume.' },
  'GBP/USD': { fullName: 'British Pound / US Dollar',   classification: 'Major',  description: 'Third most traded pair. Sensitive to UK economic data and BoE.' },
  'USD/JPY': { fullName: 'US Dollar / Japanese Yen',    classification: 'Major',  description: 'Second most traded. Safe-haven flows and BoJ policy driven.' },
  'USD/CHF': { fullName: 'US Dollar / Swiss Franc',     classification: 'Major',  description: 'Safe-haven pair. Inversely correlated with EUR/USD.' },
  'AUD/USD': { fullName: 'Australian Dollar / US Dollar', classification: 'Major', description: 'Commodity currency. Sensitive to China demand and iron ore.' },
  'USD/CAD': { fullName: 'US Dollar / Canadian Dollar', classification: 'Major',  description: 'Oil-correlated pair. CAD strengthens with crude prices.' },
  'NZD/USD': { fullName: 'New Zealand Dollar / US Dollar', classification: 'Minor', description: 'Dairy-commodity linked. Smaller liquidity than majors.' },
  'USD/CNY': { fullName: 'US Dollar / Chinese Yuan',    classification: 'Exotic', description: 'Managed float. PBoC sets daily fixing rate. Trade war indicator.' },
}

const CLASS_COLOR: Record<string, string> = {
  Major:  '#22c55e',
  Minor:  '#f59e0b',
  Exotic: '#a855f7',
}

// ─── Trading sessions (UTC hours) ─────────────────────────────────────────

const SESSIONS = [
  { name: 'Tokyo',    open: 0,  close: 9  },
  { name: 'London',  open: 8,  close: 16 },
  { name: 'New York',open: 13, close: 21 },
  { name: 'Sydney',  open: 22, close: 30 }, // 22:00–06:00 → 06:00 = hour 30 mod 24
]

function getActiveSessions(): string[] {
  const now = new Date()
  const h   = now.getUTCHours() + now.getUTCMinutes() / 60
  return SESSIONS
    .filter(s => s.close <= 24
      ? h >= s.open && h < s.close
      : h >= s.open || h < s.close - 24)
    .map(s => s.name)
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ForexStrength({ symbol }: { symbol: string }) {
  const [activeSessions, setActiveSessions] = useState<string[]>([])

  // Update sessions every minute
  useEffect(() => {
    const tick = () => setActiveSessions(getActiveSessions())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  const info  = PAIR_INFO[symbol]
  const color = CLASS_COLOR[info?.classification ?? ''] ?? '#64748b'

  return (
    <div className="border-b border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M2 10l3-4 3 2 3-5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 4v3h-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Pair Overview
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="bg-[var(--surface)]">
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-3">

          {/* Block 1: Identity */}
          <div className="bg-[var(--surface)] px-4 py-3">
            <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Pair
            </p>
            <p className="font-mono text-[13px] font-bold text-[var(--text)]">
              {info?.fullName ?? symbol}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="rounded-sm px-1.5 py-px font-mono text-[8px] font-bold uppercase"
                style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
              >
                {info?.classification ?? 'Forex'}
              </span>
              <span className="font-mono text-[8px] text-[var(--text-muted)]">{symbol}</span>
            </div>
          </div>

          {/* Block 2: Description */}
          <div className="bg-[var(--surface)] px-4 py-3">
            <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Characteristics
            </p>
            <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)]">
              {info?.description ?? 'Forex currency pair.'}
            </p>
          </div>

          {/* Block 3: Active sessions */}
          <div className="bg-[var(--surface)] px-4 py-3">
            <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Trading Sessions (UTC)
            </p>
            <div className="flex flex-col gap-1">
              {SESSIONS.map(s => {
                const active    = activeSessions.includes(s.name)
                const closeHour = s.close > 24 ? s.close - 24 : s.close
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: active ? 'var(--price-up)' : '#334155' }}
                    />
                    <span
                      className="font-mono text-[9px] font-semibold"
                      style={{ color: active ? '#fff' : 'var(--text-muted)' }}
                    >
                      {s.name}
                    </span>
                    <span className="font-mono text-[8px] text-[var(--text-muted)]">
                      {String(s.open).padStart(2, '0')}:00–{String(closeHour).padStart(2, '0')}:00
                    </span>
                    {active && (
                      <span className="font-mono text-[7px] font-bold uppercase" style={{ color: 'var(--price-up)' }}>
                        OPEN
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
