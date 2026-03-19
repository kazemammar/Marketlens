import { CompanyFinancials, FinancialMetrics } from '@/lib/utils/types'
import { formatCompact, formatNumber, formatPercent } from '@/lib/utils/formatters'
import { getFinancials } from '@/lib/api/fmp'
import { getFinancialMetrics } from '@/lib/api/finnhub'

interface FinancialsData {
  financials: CompanyFinancials | null
  metrics:    FinancialMetrics  | null
}

interface FinancialsTableProps {
  symbol: string
}

async function fetchFinancials(symbol: string): Promise<FinancialsData> {
  const [financials, metrics] = await Promise.allSettled([
    getFinancials(symbol, 'quarter'),
    getFinancialMetrics(symbol),
  ])
  return {
    financials: financials.status === 'fulfilled' ? financials.value : null,
    metrics:    metrics.status    === 'fulfilled' ? metrics.value    : null,
  }
}

function MetricRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium font-mono tabular-nums text-[var(--text)]">
        {value ?? '—'}
      </span>
    </div>
  )
}

export default async function FinancialsTable({ symbol }: FinancialsTableProps) {
  const { financials, metrics } = await fetchFinancials(symbol)

  const hasFinancials = financials && financials.incomeStatements.length > 0
  const hasMetrics    = metrics !== null

  if (!hasFinancials && !hasMetrics) {
    return (
      <section>
        <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Financials</h2>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">Financial data temporarily unavailable — try again later.</p>
        </div>
      </section>
    )
  }

  // Use the 4 most recent quarters
  const quarters = financials?.incomeStatements.slice(0, 4) ?? []

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Financials</h2>

      {/* ── Income statement table ── */}
      {quarters.length > 0 && (
        <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--text-muted)]">Period</th>
                {quarters.map((q) => (
                  <th key={q.period} className="px-4 py-3 text-right font-medium text-[var(--text-muted)]">
                    {q.period.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { label: 'Revenue',          key: 'revenue'         as const },
                { label: 'Gross Profit',     key: 'grossProfit'     as const },
                { label: 'Operating Income', key: 'operatingIncome' as const },
                { label: 'Net Income',       key: 'netIncome'       as const },
                { label: 'EBITDA',           key: 'ebitda'          as const },
                { label: 'EPS',              key: 'eps'             as const },
              ].map(({ label, key }) => (
                <tr key={key} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--text)]">{label}</td>
                  {quarters.map((q) => {
                    const v = q[key]
                    const formatted = key === 'eps'
                      ? `$${formatNumber(v)}`
                      : formatCompact(v)
                    return (
                      <td key={q.period} className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--text)]">
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMetrics && (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <h3 className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Key Ratios</h3>
          <div className="divide-y divide-[var(--border)]">
            <MetricRow label="P/E Ratio"     value={metrics!.peRatio       != null ? formatNumber(metrics!.peRatio, 2)       : null} />
            <MetricRow label="P/B Ratio"     value={metrics!.pbRatio       != null ? formatNumber(metrics!.pbRatio, 2)       : null} />
            <MetricRow label="P/S Ratio"     value={metrics!.psRatio       != null ? formatNumber(metrics!.psRatio, 2)       : null} />
            <MetricRow label="ROE"           value={metrics!.roe           != null ? formatPercent(metrics!.roe / 100)       : null} />
            <MetricRow label="ROA"           value={metrics!.roa           != null ? formatPercent(metrics!.roa / 100)       : null} />
            <MetricRow label="Net Margin"    value={metrics!.netProfitMargin != null ? formatPercent(metrics!.netProfitMargin / 100) : null} />
            <MetricRow label="Debt/Equity"   value={metrics!.debtToEquity  != null ? formatNumber(metrics!.debtToEquity, 2)  : null} />
            <MetricRow label="Current Ratio" value={metrics!.currentRatio  != null ? formatNumber(metrics!.currentRatio, 2)  : null} />
            <MetricRow label="52W High"      value={metrics!.week52High    != null ? `$${formatNumber(metrics!.week52High)}`  : null} />
            <MetricRow label="52W Low"       value={metrics!.week52Low     != null ? `$${formatNumber(metrics!.week52Low)}`   : null} />
            {metrics!.dividendYield != null && (
              <MetricRow label="Dividend Yield" value={formatPercent(metrics!.dividendYield / 100)} />
            )}
            {metrics!.marketCap != null && (
              <MetricRow label="Market Cap" value={`$${formatCompact(metrics!.marketCap * 1e6)}`} />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
