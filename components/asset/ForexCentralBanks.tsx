'use client'

import { useFetch } from '@/lib/hooks/useFetch'

// ─── Types ────────────────────────────────────────────────────────────────

interface CbSide {
  currency:         string
  name:             string
  bank:             string
  rate:             number | null
  previousRate:     number | null
  rateChange:       number | null
  nextMeeting:      string | null
  upcomingMeetings: string[]
}

interface CbData {
  base:           CbSide | null
  quote:          CbSide | null
  differential:   number | null
  carryDirection: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  CHF: '🇨🇭', AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CNY: '🇨🇳',
}

function daysUntil(dateStr: string): number {
  const now   = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}

function fmtRate(r: number | null): string {
  if (r === null) return '—'
  return `${r.toFixed(2)}%`
}

function formatMeetingDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Sub-component: one side of the comparison ───────────────────────────

function CbPanel({ side, align }: { side: CbSide; align: 'left' | 'right' }) {
  const flag    = FLAGS[side.currency] ?? '🏦'
  const days    = side.nextMeeting ? daysUntil(side.nextMeeting) : null
  const changed = side.rateChange !== null && Math.abs(side.rateChange) >= 0.01

  // Hawkish/dovish/hold
  const changeLabel = changed
    ? side.rateChange! > 0
      ? `+${side.rateChange!.toFixed(2)} HIKE`
      : `${side.rateChange!.toFixed(2)} CUT`
    : 'HOLD'
  const changeColor = changed
    ? side.rateChange! > 0 ? '#ef4444' : '#22c55e'
    : '#64748b'

  const textAlign = align === 'right' ? 'text-right' : 'text-left'
  const itemsAlign = align === 'right' ? 'items-end' : 'items-start'

  return (
    <div className={`flex flex-col gap-2 p-4 ${itemsAlign}`}>
      {/* Currency header */}
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-lg leading-none">{flag}</span>
        <div className={textAlign}>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            {side.currency}
          </div>
          <div className="font-mono text-[8px] text-[var(--text-muted)]">{side.bank}</div>
        </div>
      </div>

      {/* Rate */}
      <div className={`flex items-end gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="font-mono text-[28px] font-bold leading-none tabular-nums text-white">
          {fmtRate(side.rate)}
        </span>
        {/* Change badge */}
        <span
          className="mb-0.5 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold"
          style={{ background: `${changeColor}18`, color: changeColor, border: `1px solid ${changeColor}33` }}
        >
          {changeLabel}
        </span>
      </div>

      {/* Next meeting */}
      {side.nextMeeting && (
        <div className={`${textAlign}`}>
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            Next meeting:{' '}
            <span className="text-white">{formatMeetingDate(side.nextMeeting)}</span>
            {days !== null && (
              <span className="ml-1 text-[var(--accent)]">({days}d)</span>
            )}
          </span>
        </div>
      )}

      {/* Upcoming meetings */}
      {side.upcomingMeetings.length > 0 && (
        <div className={`flex flex-col gap-0.5 ${itemsAlign}`}>
          {side.upcomingMeetings.map(d => (
            <span key={d} className="font-mono text-[8px] text-[var(--text-muted)]">
              {formatMeetingDate(d)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="bg-[var(--surface)]">
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        {[0, 1].map(i => (
          <div key={i} className="flex flex-col gap-3 bg-[var(--surface)] p-4">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-8 w-24 rounded" />
            <div className="skeleton h-2.5 w-32 rounded" />
            <div className="skeleton h-2 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="skeleton h-3 w-48 rounded" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function ForexCentralBanks({ symbol }: { symbol: string }) {
  // Parse "EUR/USD" → base=EUR, quote=USD
  const [base, quote] = symbol.includes('/')
    ? symbol.split('/')
    : [symbol.slice(0, 3), symbol.slice(3)]

  const { data, loading } = useFetch<CbData>(
    `/api/forex/central-banks?base=${base}&quote=${quote}`,
    { refreshInterval: 60 * 60_000 },
  )

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="4" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 8h6M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Central Bank Comparison
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {loading ? <Skeleton /> : !data?.base || !data?.quote ? (
        <p className="bg-[var(--surface)] px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">
          Rate data unavailable
        </p>
      ) : (
        <div className="bg-[var(--surface)]">
          {/* Side-by-side panels */}
          <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
            <CbPanel side={data.base}  align="left"  />
            <CbPanel side={data.quote} align="right" />
          </div>

          {/* Differential strip */}
          <div className="border-t border-[var(--border)] px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Rate Differential
              </span>
              <span className="font-mono text-[10px] text-white">
                {data.base.currency} {fmtRate(data.base.rate)}
                <span className="mx-1.5 text-[var(--text-muted)]">vs</span>
                {data.quote.currency} {fmtRate(data.quote.rate)}
                {data.differential !== null && (
                  <span
                    className="ml-2 font-bold"
                    style={{ color: data.differential > 0 ? 'var(--price-up)' : data.differential < 0 ? 'var(--price-down)' : '#64748b' }}
                  >
                    {data.differential > 0 ? '+' : ''}{data.differential.toFixed(2)}pp
                  </span>
                )}
              </span>
              {data.carryDirection && (
                <span className="rounded-sm bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] text-[var(--accent)]">
                  {data.carryDirection}
                </span>
              )}
            </div>

            {/* Differential bar — centered at 0 */}
            {data.differential !== null && (
              (() => {
                const maxDiff  = 8 // ±8pp covers virtually all realistic spreads
                const clamped  = Math.max(-maxDiff, Math.min(maxDiff, data.differential))
                const pct      = Math.abs(clamped / maxDiff) * 50
                const positive = clamped >= 0
                const barColor = positive ? 'var(--price-up)' : 'var(--price-down)'
                return (
                  <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    {/* Center marker */}
                    <div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-[var(--border)]" />
                    {/* Bar extending from center */}
                    <div
                      className="absolute top-0 h-full rounded-full transition-all duration-700"
                      style={{
                        left:       positive ? '50%' : `${50 - pct}%`,
                        width:      `${pct}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                )
              })()
            )}
            <div className="mt-1 flex justify-between font-mono text-[7px] text-[var(--text-muted)]">
              <span>{data.quote.currency} advantage</span>
              <span>parity</span>
              <span>{data.base.currency} advantage</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
