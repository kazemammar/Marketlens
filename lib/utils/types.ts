export type AssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'

export type SentimentLabel = 'Bullish' | 'Bearish' | 'Neutral'

// ─── Asset search result ───────────────────────────────────────────────────

export interface Asset {
  symbol: string
  name: string
  type: AssetType
  exchange?: string
  currency?: string
  logoUrl?: string
}

// ─── Live quote ───────────────────────────────────────────────────────────

export interface Quote {
  symbol: string
  name: string
  type: AssetType
  price: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  volume?: number
  marketCap?: number
  currency: string
  timestamp: number
}

// ─── News ─────────────────────────────────────────────────────────────────

export interface NewsArticle {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  imageUrl?: string
  publishedAt: number // unix timestamp (ms)
  relatedSymbols?: string[]
}

// ─── AI Sentiment ─────────────────────────────────────────────────────────

export interface SentimentAnalysis {
  symbol: string
  label: SentimentLabel
  score: number // 0–100, higher = more bullish
  summary: string
  keySignals: string[]
  analyzedAt: number // unix timestamp (ms)
}

// ─── Company financials ───────────────────────────────────────────────────

export interface IncomeStatement {
  period: string // e.g. "2024-Q3" or "2023"
  revenue: number
  grossProfit: number
  operatingIncome: number
  netIncome: number
  eps: number
  ebitda: number
}

export interface BalanceSheet {
  period: string
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  cash: number
  totalDebt: number
}

export interface CashFlowStatement {
  period: string
  operatingCashFlow: number
  investingCashFlow: number
  financingCashFlow: number
  freeCashFlow: number
  capitalExpenditures: number
}

export interface CompanyFinancials {
  symbol: string
  incomeStatements: IncomeStatement[]
  balanceSheets: BalanceSheet[]
  cashFlowStatements: CashFlowStatement[]
}

export interface FinancialRatios {
  symbol: string
  peRatio: number | null
  pbRatio: number | null
  psRatio: number | null
  evToEbitda: number | null
  debtToEquity: number | null
  currentRatio: number | null
  returnOnEquity: number | null
  returnOnAssets: number | null
  profitMargin: number | null
  dividendYield: number | null
}

// ─── Analyst recommendations ──────────────────────────────────────────────

export interface AnalystRecommendation {
  symbol: string
  period: string // e.g. "2024-10"
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
}

export interface PriceTarget {
  symbol: string
  lastUpdated: string
  low: number
  median: number
  high: number
  mean: number
  consensus: string // "Buy" | "Hold" | "Sell" etc.
}

// ─── CoinGecko ────────────────────────────────────────────────────────────

export interface CryptoMarket {
  id: string
  symbol: string
  name: string
  image: string
  currentPrice: number
  marketCap: number
  marketCapRank: number
  fullyDilutedValuation: number | null
  totalVolume: number
  high24h: number
  low24h: number
  priceChange24h: number
  priceChangePercent24h: number
  circulatingSupply: number
  totalSupply: number | null
  maxSupply: number | null
  ath: number
  athChangePercent: number
  atl: number
  atlChangePercent: number
}

// ─── Financial metrics (Finnhub /stock/metric) ───────────────────────────

export interface FinancialMetrics {
  peRatio:        number | null
  pbRatio:        number | null
  psRatio:        number | null
  roe:            number | null
  roa:            number | null
  netProfitMargin: number | null
  debtToEquity:   number | null
  currentRatio:   number | null
  week52High:     number | null
  week52Low:      number | null
  dividendYield:  number | null
  marketCap:      number | null // in millions USD
}

// ─── Quarterly earnings (Finnhub /stock/earnings) ─────────────────────────

export interface EarningsData {
  period:          string
  quarter:         number
  year:            number
  actual:          number
  estimate:        number
  surprise:        number
  surprisePercent: number
}

// ─── Dashboard card ───────────────────────────────────────────────────────
// Shared by AssetCard component, API routes, and API clients.

export interface AssetCardData {
  symbol:        string
  name:          string
  type:          AssetType
  price:         number
  change:        number
  changePercent: number
  currency:      string
  open:          number
  high:          number
  low:           number
  sparkline?:    number[]   // optional historical closes for the sparkline path
  dataAsOf?:     string     // ISO date (YYYY-MM-DD) of the underlying data — used by forex to surface ECB publication date
}

// ─── RSS ──────────────────────────────────────────────────────────────────

export interface RssFeed {
  name: string
  url: string
}

// ─── Insider transactions ─────────────────────────────────────────────────

export interface InsiderTransaction {
  name: string
  shares: number
  change: number
  filingDate: string
  transactionDate: string
  type: 'Purchase' | 'Sale' | 'Grant' | 'Exercise' | 'Other'
  price: number
}

// ─── Portfolio ─────────────────────────────────────────────────────────────

export interface PortfolioPosition {
  id:         string
  symbol:     string
  asset_type: AssetType
  direction:  'long' | 'short'
  quantity:   number | null
  avg_cost:   number | null
  notes:      string | null
  added_at:   string
  updated_at: string
}

