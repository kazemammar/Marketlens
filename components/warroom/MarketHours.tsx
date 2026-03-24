'use client'

import { useState, useEffect } from 'react'

interface Exchange {
  name:   string
  abbr:   string
  tz:     string
  open:   number  // hour in local time (24h)
  close:  number
  flag:   string
}

const EXCHANGES: Exchange[] = [
  { name: 'New York',  abbr: 'NYSE',  tz: 'America/New_York',    open: 9.5,  close: 16, flag: '🇺🇸' },
  { name: 'London',    abbr: 'LSE',   tz: 'Europe/London',       open: 8,    close: 16.5, flag: '🇬🇧' },
  { name: 'Tokyo',     abbr: 'TSE',   tz: 'Asia/Tokyo',          open: 9,    close: 15, flag: '🇯🇵' },
  { name: 'Shanghai',  abbr: 'SSE',   tz: 'Asia/Shanghai',       open: 9.5,  close: 15, flag: '🇨🇳' },
  { name: 'Frankfurt', abbr: 'FRA',   tz: 'Europe/Berlin',       open: 8,    close: 17.5, flag: '🇩🇪' },
]

function getLocalHour(tz: string): number {
  const now = new Date()
  const parts = now.toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })
  const [h, m] = parts.split(':').map(Number)
  return h + m / 60
}

function getLocalDay(tz: string): number {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay()
}

function isOpen(ex: Exchange): boolean {
  const day = getLocalDay(ex.tz)
  if (day === 0 || day === 6) return false
  const hour = getLocalHour(ex.tz)
  return hour >= ex.open && hour < ex.close
}

function timeUntil(ex: Exchange): string {
  const hour = getLocalHour(ex.tz)
  const day  = getLocalDay(ex.tz)
  const open = isOpen(ex)

  if (open) {
    const minLeft = Math.floor((ex.close - hour) * 60)
    const h = Math.floor(minLeft / 60)
    const m = minLeft % 60
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  // Calculate time until next open
  let hoursUntil = ex.open - hour
  if (hoursUntil < 0 || day === 0 || day === 6) {
    // Already past open today or weekend — next business day
    const daysToAdd = day === 6 ? 2 : day === 0 ? 1 : 1
    hoursUntil = daysToAdd * 24 + (ex.open - hour)
    if (hoursUntil < 0) hoursUntil += 24
  }

  const h = Math.floor(hoursUntil)
  const m = Math.floor((hoursUntil - h) * 60)
  return h > 0 ? `opens in ${h}h ${m}m` : `opens in ${m}m`
}

function formatLocalTime(tz: string): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function MarketHours() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden>
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mr-1">
        Markets
      </span>
      {EXCHANGES.map((ex) => {
        const open = isOpen(ex)
        return (
          <div
            key={ex.abbr}
            className="flex shrink-0 items-center gap-1.5 rounded border border-[var(--border)] px-2 py-1"
            title={`${ex.name} — ${timeUntil(ex)}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${open ? 'live-dot' : ''}`}
              style={{ background: open ? 'var(--price-up)' : 'var(--price-down)' }}
            />
            <span className="font-mono text-[9px] font-bold text-[var(--text)]">{ex.abbr}</span>
            <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)]">
              {formatLocalTime(ex.tz)}
            </span>
            <span
              className="font-mono text-[9px] font-semibold uppercase"
              style={{ color: open ? 'var(--price-up)' : 'var(--text-muted)' }}
            >
              {open ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
