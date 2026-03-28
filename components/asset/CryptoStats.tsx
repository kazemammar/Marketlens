'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface CryptoStatsData {
  name:              string
  symbol:            string
  rank:              number
  price:             number
  marketCap:         number
  volume24h:         number
  high24h:           number
  low24h:            number
  priceChange24h:    number
  circulatingSupply: number
  totalSupply:       number | null
  maxSupply:         number | null
  ath:               number
  athChangePercent:  number
  atl:               number
  atlChangePercent:  number
}

function fmtBig(n: number): string {
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`
  if (n >= 1_000_000_000)     return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)         return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtSupply(n: number | null, symbol: string): string {
  if (!n) return '∞'
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B ${symbol}`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(2)}M ${symbol}`
  return `${n.toLocaleString()} ${symbol}`
}

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (n >= 1)    return `$${n.toFixed(4)}`
  return `$${n.toPrecision(4)}`
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: React.ReactNode }

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5 bg-[var(--surface)] px-3 py-2.5">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-mono text-[15px] font-bold leading-tight text-[var(--text)] tabular-nums">
        {value}
      </span>
      {sub && <span className="font-mono text-[9px] text-[var(--text-muted)]">{sub}</span>}
    </div>
  )
}

export default function CryptoStats({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<CryptoStatsData>(`/api/crypto/stats/${symbol}`, { refreshInterval: 2 * 60_000 })

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="2" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="9" y="2" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="2" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="9" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Market Data
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface)] px-3 py-2.5">
              <div className="skeleton mb-1.5 h-2 w-16 rounded" />
              <div className="skeleton h-5 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <p className="bg-[var(--surface)] px-4 py-4 font-mono text-[10px] text-[var(--text-muted)]">
          Market data unavailable
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
            <StatCard
              label="CMC Rank"
              value={`#${data.rank}`}
            />
            <StatCard
              label="Market Cap"
              value={fmtBig(data.marketCap)}
            />
            <StatCard
              label="24h Volume"
              value={fmtBig(data.volume24h)}
            />
            <StatCard
              label="Circulating Supply"
              value={fmtSupply(data.circulatingSupply, data.symbol)}
              sub={data.maxSupply ? `Max: ${fmtSupply(data.maxSupply, data.symbol)}` : 'No max supply'}
            />
            <StatCard
              label="All-Time High"
              value={fmtPrice(data.ath)}
              sub={
                <span style={{ color: (data.athChangePercent ?? 0) > -10 ? 'var(--price-up)' : (data.athChangePercent ?? 0) < -30 ? 'var(--price-down)' : '#f59e0b' }}>
                  {(data.athChangePercent ?? 0).toFixed(1)}% from ATH
                </span>
              }
            />
            <StatCard
              label="All-Time Low"
              value={fmtPrice(data.atl)}
              sub={
                <span style={{ color: 'var(--price-up)' }}>
                  +{(data.atlChangePercent ?? 0).toFixed(0)}% from ATL
                </span>
              }
            />
            <StatCard
              label="24h High"
              value={fmtPrice(data.high24h)}
            />
            <StatCard
              label="24h Low"
              value={fmtPrice(data.low24h)}
            />
          </div>

          {/* 24h range bar */}
          <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                24H Range
              </span>
              {data.high24h > 0 && data.low24h > 0 && (
                <span className="font-mono text-[8px] text-[var(--text-muted)]">
                  Position:{' '}
                  <span className="text-[var(--text)]">
                    {(((data.price - data.low24h) / (data.high24h - data.low24h)) * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)]">{fmtPrice(data.low24h)}</span>
              <div className="relative flex-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                {data.high24h > data.low24h && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${((data.price - data.low24h) / (data.high24h - data.low24h)) * 100}%`,
                      background: data.priceChange24h >= 0 ? 'var(--price-up)' : 'var(--price-down)',
                    }}
                  />
                )}
              </div>
              <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)]">{fmtPrice(data.high24h)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
