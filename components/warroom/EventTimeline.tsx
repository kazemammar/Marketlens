'use client'

import { useRef, useState, useEffect } from 'react'
import { useFetch } from '@/lib/hooks/useFetch'
import type { MarketEvent, MarketEventsPayload } from '@/app/api/market-events/route'

const CATEGORY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  rates:        { color: '#3b82f6', bg: '#3b82f620', label: 'Rates' },
  macro:        { color: '#f59e0b', bg: '#f59e0b20', label: 'Macro' },
  geopolitical: { color: '#ef4444', bg: '#ef444420', label: 'Geopolitical' },
  tech:         { color: '#a855f7', bg: '#a855f720', label: 'Tech' },
  political:    { color: '#6b7280', bg: '#6b728020', label: 'Political' },
  trade:        { color: '#f97316', bg: '#f9731620', label: 'Trade' },
  fx:           { color: '#06b6d4', bg: '#06b6d420', label: 'FX' },
  earnings:     { color: '#22c55e', bg: '#22c55e20', label: 'Earnings' },
}

const IMPACT_ICON: Record<string, { icon: string; color: string }> = {
  positive: { icon: '▲', color: 'var(--price-up)' },
  negative: { icon: '▼', color: 'var(--price-down)' },
  neutral:  { icon: '—', color: 'var(--text-muted)' },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatYear(dateStr: string): string {
  return dateStr.slice(0, 4)
}

export default function EventTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const hasScrolled = useRef(false)

  const { data, loading } = useFetch<MarketEventsPayload>('/api/market-events', {
    refreshInterval: 60 * 60_000, // 1h
  })

  const events: MarketEvent[] = data?.events ?? []

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  // Auto-scroll to the right (most recent) on first load
  useEffect(() => {
    const el = scrollRef.current
    if (!el || events.length === 0 || hasScrolled.current) return
    // Use requestAnimationFrame to ensure layout is computed
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth
      hasScrolled.current = true
      checkScroll()
    })
  }, [events])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => el.removeEventListener('scroll', checkScroll)
  }, [events])

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' })
  }

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="4" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="8" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Market Event Timeline
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />

        {/* Scroll arrows */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)] disabled:opacity-20 disabled:cursor-default"
            aria-label="Scroll left (older)"
          >
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none"><path d="M6 2L3 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex h-5 w-5 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)] disabled:opacity-20 disabled:cursor-default"
            aria-label="Scroll right (newer)"
          >
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none"><path d="M4 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          AI-generated · 24H cache
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex gap-1.5 overflow-hidden p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[220px] rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="skeleton h-2 w-16 rounded mb-2" />
              <div className="skeleton h-2 w-10 rounded mb-2" />
              <div className="skeleton h-3 w-full rounded mb-1.5" />
              <div className="skeleton h-2 w-full rounded mb-1" />
              <div className="skeleton h-2 w-3/4 rounded" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="px-3 py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
          Event timeline unavailable
        </p>
      ) : (
        <div className="relative">
          {/* Connecting timeline line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--border)] opacity-30 z-0 pointer-events-none" />

          <div
            ref={scrollRef}
            className="relative z-10 flex gap-1.5 overflow-x-auto p-3 scrollbar-hide"
          >
            {events.map((event, i) => {
              const cat = CATEGORY_STYLE[event.category] ?? CATEGORY_STYLE.macro
              const imp = IMPACT_ICON[event.impact] ?? IMPACT_ICON.neutral
              const showYear = i === 0 || formatYear(event.date) !== formatYear(events[i - 1].date)
              return (
                <div key={event.date + event.title} className="flex shrink-0 items-center gap-1.5">
                  {/* Year divider */}
                  {showYear && i > 0 && (
                    <div className="flex flex-col items-center justify-center px-1">
                      <div className="h-6 w-px bg-[var(--accent)] opacity-30" />
                      <span className="font-mono text-[8px] font-bold text-[var(--accent)] opacity-50">{formatYear(event.date)}</span>
                      <div className="h-6 w-px bg-[var(--accent)] opacity-30" />
                    </div>
                  )}

                  {/* Event card */}
                  <div className="w-[220px] rounded border border-[var(--border)] bg-[var(--surface-2)] p-2.5 transition hover:border-[var(--accent)]/30">
                    {/* Date + category + impact */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">
                        {formatDate(event.date)}
                      </span>
                      <span
                        className="rounded px-1 py-px font-mono text-[7px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: cat.color, background: cat.bg, border: `1px solid ${cat.color}33` }}
                      >
                        {cat.label}
                      </span>
                      <span className="ml-auto font-mono text-[9px] font-bold" style={{ color: imp.color }}>
                        {imp.icon}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-mono text-[10px] font-bold text-[var(--text)] leading-snug mb-1">
                      {event.title}
                    </p>

                    {/* Detail */}
                    <p className="font-mono text-[9px] text-[var(--text-muted)] leading-relaxed line-clamp-3">
                      {event.detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
