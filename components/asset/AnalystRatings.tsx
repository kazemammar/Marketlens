import { AnalystRecommendation } from '@/lib/utils/types'
import { getRecommendations } from '@/lib/api/finnhub'

interface AnalystRatingsProps {
  symbol: string
}

async function fetchRecommendations(symbol: string): Promise<AnalystRecommendation[]> {
  try {
    return await getRecommendations(symbol)
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
    ? 'text-[var(--price-up)] bg-[var(--accent-dim)]'
    : consensus === 'Sell'
    ? 'text-[var(--price-down)] bg-[var(--danger-dim)]'
    : 'text-[var(--warning)] bg-[var(--warning-dim)]'

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-[var(--text-muted)]">{recs.period} · {total} analysts</span>
        <span className={`rounded px-2 py-0.5 font-mono text-[9px] font-bold ${consColor}`}>
          {consensus}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-1.5 w-full overflow-hidden rounded-full">
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
          <div key={b.label} className="flex items-center gap-1.5 font-mono text-[9px] text-[var(--text-muted)]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${b.color}`} />
            {b.label} <span className="font-semibold text-[var(--text)]">{b.count}</span>
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
      <div className="mb-2 flex items-center gap-2"><h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Analyst Ratings</h2><div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" /></div>

      {recs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-8 text-center">
          <p className="font-mono text-[10px] text-[var(--text-muted)]">No analyst data available.</p>
        </div>
      ) : (
        <div className="space-y-4 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
          {recs.slice(0, 3).map((rec) => (
            <ConsensusBar key={rec.period} recs={rec} />
          ))}
        </div>
      )}
    </section>
  )
}
