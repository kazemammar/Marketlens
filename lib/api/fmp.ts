import { cachedFetch, cacheKey } from '@/lib/cache/redis'
import { TTL, FMP_BASE_URL } from '@/lib/utils/constants'

// Stable endpoint base — replaces legacy /api/v3 paths that now return 404
const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable'
import {
  Asset,
  AssetType,
  CompanyFinancials,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
  FinancialRatios,
} from '@/lib/utils/types'

// ─── Internal helpers ─────────────────────────────────────────────────────

async function fmpGet<T>(path: string, base = FMP_BASE_URL): Promise<T> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) throw new Error('FMP_API_KEY is not set')

  const url = `${base}${path}${path.includes('?') ? '&' : '?'}apikey=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } })

  if (!res.ok) {
    throw new Error(`FMP ${path} → HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─── Raw FMP response shapes ──────────────────────────────────────────────

interface FmpIncomeStatement {
  date:                      string
  period:                    string
  revenue:                   number
  grossProfit:               number
  operatingIncome:           number
  netIncome:                 number
  eps:                       number
  ebitda:                    number
}

interface FmpBalanceSheet {
  date:             string
  period:           string
  totalAssets:      number
  totalLiabilities: number
  totalEquity:      number
  cashAndCashEquivalents: number
  totalDebt:        number
}

interface FmpCashFlow {
  date:                        string
  period:                      string
  operatingCashFlow:           number
  investingCashFlow:           number | null
  financingCashFlow:           number | null
  freeCashFlow:                number
  capitalExpenditure:          number
}

interface FmpRatios {
  symbol:                   string
  priceEarningsRatio:       number | null
  priceToBookRatio:         number | null
  priceToSalesRatio:        number | null
  enterpriseValueMultiple:  number | null
  debtEquityRatio:          number | null
  currentRatio:             number | null
  returnOnEquity:           number | null
  returnOnAssets:           number | null
  netProfitMargin:          number | null
  dividendYield:            number | null
}

interface FmpSearchResult {
  symbol:       string
  name:         string
  currency:     string
  stockExchange: string
  exchangeShortName: string
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Fetch income statement, balance sheet, and cash flow for a symbol.
 * Uses annual statements by default; pass `period="quarter"` for quarterly.
 */
export async function getFinancials(
  symbol: string,
  period: 'annual' | 'quarter' = 'annual',
): Promise<CompanyFinancials> {
  return cachedFetch(
    `${cacheKey.financials(symbol)}:${period}`,
    TTL.FINANCIALS,
    async () => {
      const [incomeRaw, balanceRaw, cashRaw] = await Promise.all([
        fmpGet<FmpIncomeStatement[]>(`/income-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=8`, FMP_STABLE_BASE_URL),
        fmpGet<FmpBalanceSheet[]>(`/balance-sheet-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=8`, FMP_STABLE_BASE_URL),
        fmpGet<FmpCashFlow[]>(`/cash-flow-statement?symbol=${encodeURIComponent(symbol)}&period=${period}&limit=8`, FMP_STABLE_BASE_URL),
      ])

      const incomeStatements: IncomeStatement[] = incomeRaw.map((r) => ({
        period:          `${r.date} (${r.period})`,
        revenue:         r.revenue,
        grossProfit:     r.grossProfit,
        operatingIncome: r.operatingIncome,
        netIncome:       r.netIncome,
        eps:             r.eps,
        ebitda:          r.ebitda,
      }))

      const balanceSheets: BalanceSheet[] = balanceRaw.map((r) => ({
        period:           `${r.date} (${r.period})`,
        totalAssets:      r.totalAssets,
        totalLiabilities: r.totalLiabilities,
        totalEquity:      r.totalEquity,
        cash:             r.cashAndCashEquivalents,
        totalDebt:        r.totalDebt,
      }))

      const cashFlowStatements: CashFlowStatement[] = cashRaw.map((r) => ({
        period:              `${r.date} (${r.period})`,
        operatingCashFlow:   r.operatingCashFlow,
        investingCashFlow:   r.investingCashFlow ?? 0,
        financingCashFlow:   r.financingCashFlow ?? 0,
        freeCashFlow:        r.freeCashFlow,
        capitalExpenditures: r.capitalExpenditure,
      }))

      return { symbol, incomeStatements, balanceSheets, cashFlowStatements }
    },
  )
}

/**
 * Fetch key financial ratios (P/E, P/B, ROE, etc.) for a symbol.
 */
export async function getRatios(symbol: string): Promise<FinancialRatios | null> {
  return cachedFetch(
    cacheKey.ratios(symbol),
    TTL.RATIOS,
    async () => {
      const data = await fmpGet<FmpRatios[]>(
        `/ratios-ttm/${encodeURIComponent(symbol)}`,
      )

      if (!data.length) return null

      const r = data[0]
      return {
        symbol,
        peRatio:        r.priceEarningsRatio,
        pbRatio:        r.priceToBookRatio,
        psRatio:        r.priceToSalesRatio,
        evToEbitda:     r.enterpriseValueMultiple,
        debtToEquity:   r.debtEquityRatio,
        currentRatio:   r.currentRatio,
        returnOnEquity: r.returnOnEquity,
        returnOnAssets: r.returnOnAssets,
        profitMargin:   r.netProfitMargin,
        dividendYield:  r.dividendYield,
      } satisfies FinancialRatios
    },
  )
}

/**
 * Search FMP for stocks, ETFs, and other assets.
 */
export async function searchAssets(query: string, type?: AssetType): Promise<Asset[]> {
  return cachedFetch(
    cacheKey.search(query, type ?? ''),
    TTL.SEARCH,
    async () => {
      const data = await fmpGet<FmpSearchResult[]>(
        `/search?query=${encodeURIComponent(query)}&limit=20`,
      )

      return data.map((r): Asset => ({
        symbol:   r.symbol,
        name:     r.name,
        type:     mapFmpExchangeToType(r.exchangeShortName),
        exchange: r.stockExchange,
        currency: r.currency,
      }))
    },
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapFmpExchangeToType(exchange: string): AssetType {
  const upper = exchange?.toUpperCase() ?? ''
  if (upper.includes('ETF')) return 'etf'
  if (upper === 'FOREX')     return 'forex'
  if (upper === 'CRYPTO')    return 'crypto'
  return 'stock'
}
