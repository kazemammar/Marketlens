import { AnalystRecommendation } from '@/lib/utils/types'

interface AnalystRatingsProps {
  symbol: string
}

async function fetchRecommendations(symbol: string): Promise<AnalystRecommendation[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/recommendations/${encodeURIComponent(symbol)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function ConsensusBar({ recs }: { recs: AnalystRecommendation }) {
  const total = recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell
  if (total === 0) return null

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`

  const bars = [
    { label: 'Strong Buy', count: recs.strongBuy,  color: 'bg-green-500' },
    { label: 'Buy',        count: recs.buy,        color: 'bg-green-400' },
    { label: 'Hold',       count: recs.hold,       color: 'bg-yellow-400' },
    { label: 'Sell',       count: recs.sell,       color: 'bg-red-400' },
    { label: 'Strong Sell',count: recs.strongSell, color: 'bg-red-500' },
  ]

  // Consensus label
  const bullish   = recs.strongBuy + recs.buy
  const bearish   = recs.sell + recs.strongSell
  const consensus = bullish / total > 0.5 ? 'Buy' : bearish / total > 0.5 ? 'Sell' : 'Hold'
  const consColor = consensus === 'Buy'
    ? 'text-green-500 bg-green-500/10'
    : consensus === 'Sell'
    ? 'text-red-500 bg-red-500/10'
    : 'text-yellow-500 bg-yellow-500/10'

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">{recs.period} · {total} analysts</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${consColor}`}>
          {consensus}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {bars.filter((b) => b.count > 0).map((b) => (
          <div
            key={b.label}
            className={b.color}
            style={{ width: pct(b.count) }}
            title={`${b.label}: ${b.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className={`inline-block h-2 w-2 rounded-full ${b.color}`} />
            {b.label} <span className="font-medium text-[var(--text)]">{b.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function AnalystRatings({ symbol }: AnalystRatingsProps) {
  const recs = await fetchRecommendations(symbol)

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">Analyst Ratings</h2>

      {recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-10 text-center">
          <p className="text-2xl">🔍</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">No analyst recommendations available.</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {recs.slice(0, 3).map((rec) => (
            <ConsensusBar key={rec.period} recs={rec} />
          ))}
        </div>
      )}
    </section>
  )
}
