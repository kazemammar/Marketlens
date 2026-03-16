'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'

interface PeerData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number | null
  logo: string | null
}

export default function PeersTable({ symbol }: { symbol: string }) {
  const [peers, setPeers] = useState<PeerData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock/peers/${symbol}`)
      .then(r => r.json())
      .then(d => { setPeers(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol])

  if (!loading && peers.length === 0) return null

  return (
    <div className="border-b border-[var(--border)]">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white">
          Sector Peers
        </span>
      </div>

      {/* Peer cards - horizontal scroll */}
      <div className="overflow-x-auto bg-[var(--surface)]">
        <div className="flex gap-px bg-[var(--border)] w-max min-w-full">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex w-36 shrink-0 flex-col gap-2 bg-[var(--surface)] px-3 py-3">
                  <div className="skeleton h-2.5 w-12 rounded" />
                  <div className="skeleton h-2 w-20 rounded" />
                  <div className="skeleton h-4 w-16 rounded" />
                </div>
              ))
            : peers.map((peer) => {
                const positive = peer.changePercent >= 0
                const color = peer.changePercent === 0 ? 'var(--price-flat)' : positive ? 'var(--price-up)' : 'var(--price-down)'
                return (
                  <Link
                    key={peer.symbol}
                    href={`/asset/stock/${encodeURIComponent(peer.symbol)}`}
                    className="group flex w-40 shrink-0 flex-col gap-1 bg-[var(--surface)] px-3 py-3 transition hover:bg-[var(--surface-2)]"
                  >
                    <div className="flex items-center gap-1.5">
                      {peer.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={peer.logo} alt="" className="h-4 w-4 rounded-sm object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : null}
                      <span className="font-mono text-[13px] font-bold text-white">{peer.symbol}</span>
                    </div>
                    <p className="truncate font-mono text-[9px] text-[var(--text-muted)]">{peer.name}</p>
                    <span className="font-mono text-[15px] font-bold tabular-nums text-white">
                      {formatPrice(peer.price)}
                    </span>
                    <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color }}>
                      {positive ? '▲' : '▼'} {formatPercent(Math.abs(peer.changePercent), false)}
                    </span>
                  </Link>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}
