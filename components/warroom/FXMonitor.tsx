'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AssetCardData } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'
import { formatForexRate } from '@/lib/utils/formatters'
import type { CurrencyStrength } from '@/app/api/forex/strength/route'

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  CHF: '🇨🇭', AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CNY: '🇨🇳',
}

// Shows the ECB publication date as a human-readable label.
// ECB reference rates are published once per trading day at ~16:00 CET.
// "just now" / "X min ago" would be misleading — the rate is from yesterday's close.
function ecbDateLabel(dateStr: string | undefined): { label: string; color: string } {
  if (!dateStr) return { label: '', color: 'var(--text-muted)' }
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (dateStr === today)      return { label: "Today's rates",     color: 'var(--price-up)' }
  if (dateStr === yesterday)  return { label: "Yesterday's rates", color: 'var(--warning)' }
  // Older — show the date (e.g. "Mar 14 rates")
  const d = new Date(dateStr + 'T12:00:00Z')
  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return { label: `${formatted} rates`, color: 'var(--price-down)' }
}

function RangeBar({ low, high, price, pair }: { low: number; high: number; price: number; pair?: string }) {
  const range = high - low
  if (range <= 0) return null
  const pct = Math.min(Math.max(((price - low) / range) * 100, 0), 100)
  const color = pct >= 60 ? 'var(--price-up)' : pct >= 40 ? 'var(--warning)' : 'var(--price-down)'
  return (
    <div className="px-3 pb-1.5 pt-0.5" title="7-day trading range — current price position between weekly low and high">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col items-end w-10 gap-px">
          <span className="font-mono text-[9px] font-bold uppercase text-[var(--text-muted)] opacity-50 leading-none">7d L</span>
          <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50 leading-none">{formatForexRate(low, pair)}</span>
        </div>
        <div className="relative flex-1 h-1 rounded-full bg-[var(--surface-3)]">
          <div
            className="absolute top-0 h-1 rounded-full"
            style={{ left: `${pct}%`, width: '3px', background: color, marginLeft: '-1.5px', boxShadow: `0 0 4px ${color}80` }}
          />
          <div
            className="absolute top-0 left-0 h-1 rounded-full opacity-25"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="flex flex-col items-start w-10 gap-px">
          <span className="font-mono text-[9px] font-bold uppercase text-[var(--text-muted)] opacity-50 leading-none">7d H</span>
          <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50 leading-none">{formatForexRate(high, pair)}</span>
        </div>
      </div>
    </div>
  )
}

export default function FXMonitor() {
  const { data, loading } = useFetch<AssetCardData[]>('/api/market?tab=forex', { refreshInterval: 30 * 60_000 })
  const { data: strengthData } = useFetch<{ strengths: CurrencyStrength[] }>(
    '/api/forex/strength',
    { refreshInterval: 5 * 60_000 },
  )
  const pairs = data ?? []
  const [tooltipOpen, setTooltipOpen] = useState(false)
  // Use ECB publication date from the data itself — more accurate than client clock
  const rateDate = pairs[0]?.dataAsOf

  const alertPairs   = pairs.filter((p) => Math.abs(p.changePercent) >= 0.5)
  const stressed1pct = alertPairs.filter((p) => Math.abs(p.changePercent) >= 1).length
  const stressed05   = alertPairs.filter((p) => Math.abs(p.changePercent) >= 0.5 && Math.abs(p.changePercent) < 1).length

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
            <path d="M2 8h3l2-5 3 10 2-5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            FX Monitor
          </span>
          {/* Indicator dot — ECB reference rates, daily publication */}
          <span
            className="h-1 w-1 rounded-full"
            style={{ background: 'var(--accent)', opacity: 0.4 }}
            title="ECB reference rates — updated once per trading day at ~16:00 CET"
          />
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-2">
          {rateDate && (() => {
            const { label, color } = ecbDateLabel(rateDate)
            return (
              <span
                className="hidden sm:inline font-mono text-[8px]"
                style={{ color }}
                title={`ECB reference rates published on ${rateDate}`}
                suppressHydrationWarning
              >
                {label}
              </span>
            )
          })()}
          {!loading && alertPairs.length > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
          >
            <span className="cursor-default rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-amber-400">
              {stressed1pct + stressed05} ALERTS
            </span>
            {tooltipOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded border border-[var(--border)] bg-[var(--surface-2)]"
                style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
              >
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">FX Alerts</p>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  {alertPairs.map((p) => {
                    const abs  = Math.abs(p.changePercent)
                    const crit = abs >= 1
                    const pos  = p.changePercent >= 0
                    return (
                      <div key={p.symbol} className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold text-[var(--text)]">{p.symbol}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[10px] tabular-nums font-semibold"
                            style={{ color: pos ? 'var(--price-up)' : 'var(--price-down)' }}
                          >
                            {pos ? '+' : ''}{p.changePercent.toFixed(2)}%
                          </span>
                          <span className={`rounded px-1 py-px font-mono text-[8px] font-bold uppercase ${crit ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {crit ? 'Critical' : 'Elevated'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-2">
                  <p className="font-mono text-[8px] leading-relaxed text-[var(--text-muted)] opacity-60">
                    Pairs with notable daily moves vs prior close may signal macro shifts or central bank action. Rates are ECB reference rates, published once per trading day.
                  </p>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="border-b border-[var(--border)] px-3 py-2">
                <div className="flex animate-pulse items-center justify-between">
                  <div className="h-2.5 w-14 rounded bg-[var(--surface-2)]" />
                  <div className="h-2.5 w-16 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))
          : pairs.length === 0
          ? (
              <p className="py-8 text-center font-mono text-[10px] text-[var(--text-muted)]">
                FX data unavailable
              </p>
            )
          : pairs.map((p) => {
              const abs      = Math.abs(p.changePercent)
              const pos      = p.changePercent >= 0
              const crit     = abs >= 1
              const warn     = abs >= 0.5 && abs < 1
              const chgColor = p.changePercent === 0 ? 'var(--price-flat)' : pos ? 'var(--price-up)' : 'var(--price-down)'
              const href     = `/asset/forex/${encodeURIComponent(p.symbol)}`
              return (
                <Link
                  key={p.symbol}
                  href={href}
                  className={`group block border-b border-[var(--border)] transition-all duration-150 hover:bg-[var(--surface-2)] ${crit ? 'bg-[rgba(255,68,68,0.04)]' : warn ? 'bg-[rgba(245,158,11,0.03)]' : ''}`}
                >
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {crit  && <span className="h-1.5 w-1.5 rounded-full bg-[var(--price-down)] shrink-0" />}
                      {!crit && <span className={`h-1 w-1 rounded-full ${warn ? 'bg-[var(--warning)]' : 'bg-[var(--surface-3)]'}`} />}
                      <span className="font-mono text-[11px] font-semibold text-[var(--text)]">
                        {p.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-[11px] tabular-nums text-[var(--text)]"
                        title={`${p.symbol} ECB reference rate`}
                      >
                        {formatForexRate(p.price, p.symbol)}
                      </span>
                      <span
                        className="w-14 text-right font-mono text-[10px] font-semibold tabular-nums"
                        style={{ color: chgColor }}
                        title="Change vs previous trading day close"
                      >
                        {p.changePercent === 0
                          ? '—'
                          : <>{p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%</>}
                      </span>
                      {/* Arrow — fades in on hover */}
                      <svg
                        viewBox="0 0 8 8" fill="none"
                        className="h-2 w-2 shrink-0 text-[var(--text-muted)] opacity-0 transition-all duration-150 group-hover:opacity-60 group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        <path d="M1.5 4h5M4 1.5L6.5 4 4 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {p.high > 0 && p.low > 0 && p.high !== p.low && (
                    <RangeBar low={p.low} high={p.high} price={p.price} pair={p.symbol} />
                  )}
                </Link>
              )
            })}

        {/* Currency Strength compact ranking */}
        {strengthData?.strengths && strengthData.strengths.length > 0 && (() => {
          const strengths = strengthData.strengths
          const maxAbs = Math.max(...strengths.map(s => Math.abs(s.score)), 0.001)
          return (
            <div className="border-t border-[var(--border)] px-3 py-2">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-60">
                  Currency Strength
                </span>
                <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-30">
                  7-day cross-rate
                </span>
              </div>
              <div className="space-y-0.5">
                {strengths.map((s) => {
                  const pct   = (Math.abs(s.score) / maxAbs) * 50
                  const isPos = s.score >= 0
                  return (
                    <div key={s.currency} className="flex items-center gap-1.5">
                      <span className="w-2.5 shrink-0 font-mono text-[9px] text-[var(--text-muted)]">{s.rank}</span>
                      <span className="w-10 shrink-0 font-mono text-[8px] font-bold text-[var(--text)]">
                        {FLAGS[s.currency]} {s.currency}
                      </span>
                      <div className="relative flex h-2.5 flex-1 items-center">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
                        {isPos ? (
                          <div className="absolute inset-y-0.5 rounded-sm" style={{ left: '50%', width: `${pct}%`, background: 'var(--price-up)', opacity: 0.8 }} />
                        ) : (
                          <div className="absolute inset-y-0.5 rounded-sm" style={{ right: '50%', width: `${pct}%`, background: 'var(--price-down)', opacity: 0.8 }} />
                        )}
                      </div>
                      <span className="w-12 shrink-0 text-right font-mono text-[8px] tabular-nums" style={{ color: isPos ? 'var(--price-up)' : 'var(--price-down)' }}>
                        {(s.score >= 0 ? '+' : '') + s.score.toFixed(3) + '%'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
