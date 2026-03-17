'use client'

// ─── Static fund metadata ─────────────────────────────────────────────────

const ETF_META: Record<string, {
  name:         string
  fullName:     string
  index:        string
  expenseRatio: string
  aum:          string
  inception:    string
  category:     string
  description:  string
}> = {
  SPY:  { name: 'SPDR S&P 500',             fullName: 'SPDR S&P 500 ETF Trust',                        index: 'S&P 500',                     expenseRatio: '0.09%', aum: '$580B', inception: '1993-01-22', category: 'Large Cap Blend',    description: 'Tracks the S&P 500 index. The original and most liquid ETF.' },
  QQQ:  { name: 'Invesco QQQ',              fullName: 'Invesco QQQ Trust',                             index: 'Nasdaq-100',                  expenseRatio: '0.20%', aum: '$310B', inception: '1999-03-10', category: 'Large Cap Growth',   description: 'Tracks 100 largest non-financial Nasdaq stocks. Tech-heavy.' },
  DIA:  { name: 'SPDR Dow Jones',           fullName: 'SPDR Dow Jones Industrial Average ETF',        index: 'Dow Jones Industrial Average', expenseRatio: '0.16%', aum: '$37B',  inception: '1998-01-14', category: 'Large Cap Value',    description: 'Tracks 30 blue-chip US stocks. Price-weighted index.' },
  IWM:  { name: 'iShares Russell 2000',     fullName: 'iShares Russell 2000 ETF',                     index: 'Russell 2000',                expenseRatio: '0.19%', aum: '$73B',  inception: '2000-05-22', category: 'Small Cap Blend',    description: 'Small-cap US stocks. Economic sensitivity indicator.' },
  VTI:  { name: 'Vanguard Total Market',    fullName: 'Vanguard Total Stock Market ETF',              index: 'CRSP US Total Market',        expenseRatio: '0.03%', aum: '$430B', inception: '2001-05-24', category: 'Total Market',       description: 'Entire US stock market. Lowest cost broad market exposure.' },
  GLD:  { name: 'SPDR Gold Shares',         fullName: 'SPDR Gold Shares',                             index: 'Gold Spot Price',             expenseRatio: '0.40%', aum: '$75B',  inception: '2004-11-18', category: 'Commodities',        description: 'Physical gold backed. Safe-haven asset.' },
  SLV:  { name: 'iShares Silver',           fullName: 'iShares Silver Trust',                         index: 'Silver Spot Price',           expenseRatio: '0.50%', aum: '$14B',  inception: '2006-04-28', category: 'Commodities',        description: 'Physical silver backed. Industrial and precious metal.' },
  TLT:  { name: 'iShares 20+ Year Treasury',fullName: 'iShares 20+ Year Treasury Bond ETF',           index: 'ICE US Treasury 20+ Year',    expenseRatio: '0.15%', aum: '$50B',  inception: '2002-07-22', category: 'Long-Term Bonds',    description: 'Long-duration US Treasuries. Highly interest rate sensitive.' },
  VNQ:  { name: 'Vanguard Real Estate',     fullName: 'Vanguard Real Estate ETF',                     index: 'MSCI US REIT Index',          expenseRatio: '0.12%', aum: '$36B',  inception: '2004-09-23', category: 'Real Estate',        description: 'US REITs. Income-focused, rate-sensitive.' },
  ARKK: { name: 'ARK Innovation',           fullName: 'ARK Innovation ETF',                           index: 'Actively Managed',            expenseRatio: '0.75%', aum: '$6B',   inception: '2014-10-31', category: 'Thematic Growth',    description: 'Actively managed disruptive innovation. High conviction, high volatility.' },
}

const CATEGORY_COLOR: Record<string, string> = {
  'Large Cap Blend':  '#3b82f6',
  'Large Cap Growth': '#6366f1',
  'Large Cap Value':  '#8b5cf6',
  'Small Cap Blend':  '#f59e0b',
  'Total Market':     '#22c55e',
  'Commodities':      '#f97316',
  'Long-Term Bonds':  '#14b8a6',
  'Real Estate':      '#ec4899',
  'Thematic Growth':  '#ef4444',
}

function formatInception(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface InfoBlock {
  label: string
  value: string
  accent?: boolean
}

function Block({ label, value, accent }: InfoBlock) {
  return (
    <div className="bg-[var(--surface)] px-4 py-3">
      <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="font-mono text-[12px] font-bold"
        style={{ color: accent ? 'var(--accent)' : 'white' }}
      >
        {value}
      </p>
    </div>
  )
}

export default function EtfOverview({ symbol }: { symbol: string }) {
  const meta  = ETF_META[symbol.toUpperCase()]
  const color = CATEGORY_COLOR[meta?.category ?? ''] ?? '#64748b'

  return (
    <div className="border-b border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="9" y="1" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="1" y="9" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="9" y="9" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Fund Overview
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="bg-[var(--surface)]">
        {meta ? (
          <>
            {/* Info blocks grid */}
            <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-5">
              {/* Name block — wider */}
              <div className="bg-[var(--surface)] px-4 py-3 sm:col-span-2 lg:col-span-2">
                <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Fund
                </p>
                <p className="font-mono text-[12px] font-bold text-[var(--text)]">{meta.name}</p>
                <p className="mt-0.5 font-mono text-[9px] text-[var(--text-muted)]">{meta.fullName}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="rounded-sm px-1.5 py-px font-mono text-[8px] font-bold uppercase"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                  >
                    {meta.category}
                  </span>
                </div>
              </div>

              <Block label="Tracks"         value={meta.index}        />
              <Block label="Expense Ratio"  value={meta.expenseRatio} accent />
              <Block label="AUM"            value={meta.aum}          />
            </div>

            {/* Second row */}
            <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
              <Block label="Inception"  value={formatInception(meta.inception)} />
              <Block label="Symbol"     value={symbol.toUpperCase()} />
              {/* Description spans remainder */}
              <div className="bg-[var(--surface)] px-4 py-3">
                <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  About
                </p>
                <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)]">
                  {meta.description}
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Minimal fallback for unknown ETFs */
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
            <div className="bg-[var(--surface)] px-4 py-3">
              <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Symbol
              </p>
              <p className="font-mono text-[16px] font-bold text-[var(--text)]">{symbol.toUpperCase()}</p>
            </div>
            <div className="bg-[var(--surface)] px-4 py-3">
              <p className="mb-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Type
              </p>
              <p className="font-mono text-[12px] font-bold text-[var(--text)]">Exchange-Traded Fund</p>
            </div>
            <div className="bg-[var(--surface)] px-4 py-3">
              <p className="font-mono text-[9px] text-[var(--text-muted)]">
                Detailed fund metadata not available for this ETF.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
