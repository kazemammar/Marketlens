'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface ChainTvlData {
  name: string
  tvl:  number
}

// Map crypto symbol to DefiLlama chain name
const CHAIN_MAP: Record<string, string> = {
  ETH:  'Ethereum',
  SOL:  'Solana',
  BNB:  'BSC',
  AVAX: 'Avalanche',
  MATIC:'Polygon',
  DOT:  'Polkadot',
  ATOM: 'Cosmos',
}

function fmtTvl(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

export default function DefiTvl({ symbol }: { symbol: string }) {
  const chainName = CHAIN_MAP[symbol.toUpperCase()]
  const { data, loading } = useFetch<ChainTvlData>(
    chainName ? `/api/crypto/defi-tvl?chain=${encodeURIComponent(chainName)}` : null,
    { refreshInterval: 60 * 60_000 },
  )

  // Only render for chains with DeFi TVL
  if (!chainName) return null

  return (
    <div className="flex flex-col gap-0.5 border-l border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        DeFi TVL
      </span>
      {loading ? (
        <div className="skeleton h-5 w-24 rounded" />
      ) : !data ? (
        <span className="font-mono text-[13px] text-[var(--text-muted)]">—</span>
      ) : (
        <>
          <span className="font-mono text-[15px] font-bold leading-tight tabular-nums text-white">
            {fmtTvl(data.tvl)}
          </span>
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            Total Value Locked · {data.name}
          </span>
        </>
      )}
    </div>
  )
}
