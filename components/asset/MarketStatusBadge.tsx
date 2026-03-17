'use client'

import { useState, useEffect } from 'react'
import type { AssetType } from '@/lib/utils/types'

interface MarketStatus {
  status: string
  color: string
}

function getMarketStatus(type: AssetType): MarketStatus {
  const now      = new Date()
  const utcHour  = now.getUTCHours()
  const utcMin   = now.getUTCMinutes()
  const utcTime  = utcHour * 60 + utcMin
  const day      = now.getUTCDay() // 0=Sun, 6=Sat

  if (type === 'crypto') {
    return { status: 'OPEN 24/7', color: 'var(--accent)' }
  }

  if (type === 'forex') {
    // Forex: Sun 22:00 UTC to Fri 22:00 UTC
    if (day === 0 && utcTime < 22 * 60) return { status: 'CLOSED', color: 'var(--danger)' }
    if (day === 6)                       return { status: 'CLOSED', color: 'var(--danger)' }
    if (day === 5 && utcTime >= 22 * 60) return { status: 'CLOSED', color: 'var(--danger)' }
    return { status: 'OPEN', color: 'var(--accent)' }
  }

  if (type === 'stock' || type === 'etf') {
    if (day === 0 || day === 6) return { status: 'CLOSED', color: 'var(--danger)' }
    const preOpen      = 9 * 60 + 30  // 09:30 UTC (4:30 AM ET — approx pre-market)
    const marketOpen   = 14 * 60 + 30 // 14:30 UTC (9:30 AM ET)
    const marketClose  = 21 * 60      // 21:00 UTC (4:00 PM ET)
    const afterClose   = 25 * 60      // 01:00 UTC next day (8:00 PM ET)

    if (utcTime >= marketOpen  && utcTime < marketClose) return { status: 'OPEN',        color: 'var(--accent)' }
    if (utcTime >= preOpen     && utcTime < marketOpen)  return { status: 'PRE-MARKET',  color: 'var(--warning)' }
    if (utcTime >= marketClose && utcTime < afterClose)  return { status: 'AFTER-HOURS', color: 'var(--warning)' }
    return { status: 'CLOSED', color: 'var(--danger)' }
  }

  if (type === 'commodity') {
    // CME futures: nearly 24h Sun-Fri with a ~1h break around 22:00-23:00 UTC
    if (day === 0 && utcTime < 23 * 60) return { status: 'CLOSED', color: 'var(--danger)' }
    if (day === 6)                       return { status: 'CLOSED', color: 'var(--danger)' }
    if (day === 5 && utcTime >= 22 * 60) return { status: 'CLOSED', color: 'var(--danger)' }
    // Daily maintenance break: 22:00–23:00 UTC
    if (utcTime >= 22 * 60 && utcTime < 23 * 60) return { status: 'BREAK', color: 'var(--warning)' }
    return { status: 'OPEN', color: 'var(--accent)' }
  }

  return { status: 'UNKNOWN', color: 'var(--text-muted)' }
}

interface Props {
  type: AssetType
}

export default function MarketStatusBadge({ type }: Props) {
  const [status, setStatus] = useState<MarketStatus>(() => getMarketStatus(type))

  useEffect(() => {
    // Re-check every 30 seconds
    const id = setInterval(() => setStatus(getMarketStatus(type)), 30_000)
    return () => clearInterval(id)
  }, [type])

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: status.color }}
      />
      <span
        className="font-mono text-[9px] font-semibold uppercase tracking-wider"
        style={{ color: status.color }}
      >
        {status.status}
      </span>
    </div>
  )
}
