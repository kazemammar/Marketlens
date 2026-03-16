import { Suspense } from 'react'
import Link from 'next/link'
import { Asset, AssetType } from '@/lib/utils/types'

export const dynamic = 'force-dynamic'

export function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return searchParams.then(({ q }) => ({
    title: q ? `Search: ${q}` : 'Search',
  }))
}

// ─── Type badge ───────────────────────────────────────────────────────────

const TYPE_COLORS: Record<AssetType, string> = {
  stock:     'bg-blue-500/10 text-blue-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-green-500/10 text-green-400',
  commodity: 'bg-yellow-500/10 text-yellow-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

const TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stocks', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodities', etf: 'ETFs',
}

function TypeBadge({ type }: { type: AssetType }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[type]}`}>
      {type}
    </span>
  )
}

// ─── Result card ─────────────────────────────────────────────────────────

function ResultCard({ asset }: { asset: Asset }) {
  const href = `/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
    >
      <TypeBadge type={asset.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--text)]">{asset.symbol}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{asset.name}</p>
      </div>
      <span className="shrink-0 text-sm text-[var(--text-muted)]" aria-hidden>→</span>
    </Link>
  )
}

// ─── Results grouped by type ──────────────────────────────────────────────

function ResultsGroup({ type, assets }: { type: AssetType; assets: Asset[] }) {
  if (assets.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        <span className={`h-2 w-2 rounded-full ${TYPE_COLORS[type].split(' ')[0]}`} />
        {TYPE_LABELS[type]}
        <span className="font-normal text-[var(--text-muted)]">({assets.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => <ResultCard key={`${a.type}-${a.symbol}`} asset={a} />)}
      </div>
    </section>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function SkeletonResults() {
  return (
    <div className="space-y-6">
      {[8, 4, 3].map((count, g) => (
        <div key={g} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
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

// ─── Async results component ──────────────────────────────────────────────

async function SearchResults({ query }: { query: string }) {
  if (!query) return null

  let results: Asset[] = []
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&limit=30`, {
      next: { revalidate: 60 },
    })
    if (res.ok) results = await res.json()
  } catch {
    // fall through to empty
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl">🔍</p>
        <p className="mt-4 text-base font-medium text-[var(--text)]">No results for &ldquo;{query}&rdquo;</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Try a different symbol or name.</p>
      </div>
    )
  }

  const byType: Partial<Record<AssetType, Asset[]>> = {}
  for (const asset of results) {
    if (!byType[asset.type]) byType[asset.type] = []
    byType[asset.type]!.push(asset)
  }

  const ORDER: AssetType[] = ['stock', 'etf', 'crypto', 'forex', 'commodity']

  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--text-muted)]">
        {results.length} result{results.length !== 1 ? 's' : ''} for <strong className="text-[var(--text)]">&ldquo;{query}&rdquo;</strong>
      </p>
      {ORDER.map((type) =>
        byType[type] ? <ResultsGroup key={type} type={type} assets={byType[type]!} /> : null,
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">
            {query ? `Search results` : 'Search'}
          </h1>
          {query && (
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Results for <span className="text-[var(--text)]">&ldquo;{query}&rdquo;</span>
            </p>
          )}
        </div>

        {!query ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-4 text-base font-medium text-[var(--text)]">Search for any asset</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Enter a stock symbol, crypto name, forex pair, or commodity in the search bar above.
            </p>
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
