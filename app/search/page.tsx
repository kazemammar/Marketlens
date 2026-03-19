import { Suspense } from 'react'
import Link from 'next/link'
import { Asset, AssetType } from '@/lib/utils/types'
import { searchSymbols } from '@/lib/api/finnhub'
import { searchCrypto } from '@/lib/api/coingecko'
import { DEFAULT_FOREX_PAIRS, DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import GlobalSearch from '@/components/search/GlobalSearch'

export const dynamic = 'force-dynamic'

export function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return searchParams.then(({ q }) => ({
    title: q ? `Search: ${q} — MarketLens` : 'Search — MarketLens',
  }))
}

// ─── Type config ──────────────────────────────────────────────────────────

const TYPE_COLORS: Record<AssetType, string> = {
  stock:     'bg-blue-500/10 text-blue-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-sky-500/10 text-sky-400',
  commodity: 'bg-amber-500/10 text-amber-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

const TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stocks', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodities', etf: 'ETFs',
}

// ─── Sub-components ───────────────────────────────────────────────────────

function TypeBadge({ type }: { type: AssetType }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  )
}

function ResultCard({ asset }: { asset: Asset }) {
  const href = `/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)]"
    >
      <TypeBadge type={asset.type} />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[12px] font-semibold text-[var(--text)]">{asset.symbol}</p>
        <p className="truncate font-mono text-[10px] text-[var(--text-muted)]">{asset.name}</p>
      </div>
      <span
        className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] transition-colors group-hover:text-[var(--accent)]"
        aria-hidden
      >
        View →
      </span>
    </Link>
  )
}

function ResultsGroup({ type, assets }: { type: AssetType; assets: Asset[] }) {
  if (assets.length === 0) return null
  const dotColor = TYPE_COLORS[type].split(' ')[0]
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {TYPE_LABELS[type]}
        </h2>
        <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)]">
          {assets.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <ResultCard key={`${a.type}-${a.symbol}`} asset={a} />
        ))}
      </div>
    </section>
  )
}

function SkeletonResults() {
  return (
    <div className="space-y-6">
      {[8, 4, 3].map((count, g) => (
        <div key={g} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <div className="h-5 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
                  <div className="h-3 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Data fetch (direct import — no HTTP self-fetch) ─────────────────────

async function fetchSearchResults(query: string): Promise<Asset[]> {
  const term = query.toLowerCase()

  const [finnhubResults, cgResults] = await Promise.allSettled([
    searchSymbols(query),
    searchCrypto(query),
  ])

  const stocks: Asset[] = []
  const etfs:   Asset[] = []

  if (finnhubResults.status === 'fulfilled') {
    for (const a of finnhubResults.value) {
      if (a.type === 'etf') etfs.push(a)
      else                  stocks.push(a)
    }
  }

  const crypto: Asset[] = cgResults.status === 'fulfilled' ? cgResults.value : []

  const forex: Asset[] = DEFAULT_FOREX_PAIRS
    .filter((p) =>
      p.symbol.toLowerCase().includes(term) ||
      p.pair.toLowerCase().includes(term)   ||
      p.base.toLowerCase().includes(term)   ||
      p.quote.toLowerCase().includes(term),
    )
    .map((p): Asset => ({ symbol: p.symbol, name: p.pair, type: 'forex' }))

  const commodities: Asset[] = DEFAULT_COMMODITIES
    .filter((c) =>
      c.symbol.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term)   ||
      c.underlying.toLowerCase().includes(term),
    )
    .map((c): Asset => ({ symbol: c.symbol, name: `${c.name} (${c.underlying})`, type: 'commodity' }))

  return [
    ...stocks.slice(0, 8),
    ...crypto.slice(0, 6),
    ...forex,
    ...commodities,
    ...etfs.slice(0, 4),
  ]
}

// ─── Async results component ──────────────────────────────────────────────

const SUGGESTIONS = ['AAPL', 'BTC', 'EUR/USD', 'GLD', 'SPY', 'NVDA', 'ETH', 'MSFT']
const ORDER: AssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity']

async function SearchResults({ query }: { query: string }) {
  if (!query) return null

  const results = await fetchSearchResults(query).catch(() => [])

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
        <p className="text-3xl">🔍</p>
        <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
          Try searching for a ticker symbol or asset name
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-[10px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const byType: Partial<Record<AssetType, Asset[]>> = {}
  for (const asset of results) {
    if (!byType[asset.type]) byType[asset.type] = []
    byType[asset.type]!.push(asset)
  }

  return (
    <div className="space-y-8">
      <p className="font-mono text-[11px] text-[var(--text-muted)]">
        {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
        <strong className="text-[var(--text)]">&ldquo;{query}&rdquo;</strong>
      </p>
      {ORDER.map((type) =>
        byType[type] ? (
          <ResultsGroup key={type} type={type} assets={byType[type]!} />
        ) : null,
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
            {query ? 'Search Results' : 'Search'}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
            {query
              ? `Showing results for "${query}" across all asset classes`
              : 'Search stocks, crypto, forex pairs, commodities, and ETFs'}
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-8">
          <GlobalSearch
            placeholder="Refine your search..."
            autoFocus={!query}
            className="w-full max-w-xl"
          />
        </div>

        {/* Results */}
        {!query ? (
          <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">🔍</p>
            <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
              Search for any asset
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Enter a symbol, name, or keyword above
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s}
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-[10px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Suspense fallback={<SkeletonResults />}>
            <SearchResults query={query} />
          </Suspense>
        )}
      </main>
    </div>
  )
}
