import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AssetType, AssetCardData } from '@/lib/utils/types'
import { CRYPTO_SYMBOL_TO_CG_ID } from '@/lib/utils/constants'
import { getQuote, getCompanyProfile } from '@/lib/api/finnhub'
import { getCryptoDetail } from '@/lib/api/coingecko'
import { getForexCards } from '@/lib/api/forex'
import AssetHeader from '@/components/asset/AssetHeader'
import TradingViewChart from '@/components/asset/TradingViewChart'
import NewsSection from '@/components/asset/NewsSection'
import FinancialsTable from '@/components/asset/FinancialsTable'
import AnalystRatings from '@/components/asset/AnalystRatings'
import SentimentCard from '@/components/asset/SentimentCard'

export const dynamic = 'force-dynamic'

interface AssetPageProps {
  params: Promise<{ type: AssetType; symbol: string }>
}

export async function generateMetadata({ params }: AssetPageProps): Promise<Metadata> {
  const { type, symbol: rawSymbol } = await params
  const symbol = decodeURIComponent(rawSymbol)

  let name = symbol
  try {
    if (type === 'stock' || type === 'etf') {
      const { getCompanyProfile } = await import('@/lib/api/finnhub')
      const profile = await getCompanyProfile(symbol)
      if (profile?.name) name = profile.name
    } else if (type === 'crypto') {
      const { getCryptoDetail } = await import('@/lib/api/coingecko')
      const cgId = CRYPTO_SYMBOL_TO_CG_ID[symbol.toUpperCase()]
      if (cgId) {
        const detail = await getCryptoDetail(cgId)
        name = detail.name
      }
    }
  } catch { /* best-effort */ }

  const title       = `${symbol.toUpperCase()} — ${name}`
  const description = `Live price, chart, news and AI sentiment for ${name} (${symbol.toUpperCase()}).`
  return {
    title,
    description,
    openGraph: { title: `${title} | MarketLens`, description },
    twitter:   { title: `${title} | MarketLens`, description },
  }
}

// ─── Data fetching helpers ────────────────────────────────────────────────

async function getStockData(symbol: string): Promise<{
  asset: AssetCardData
  logoUrl?: string
  exchange?: string
  industry?: string
} | null> {
  try {
    const [quote, profile] = await Promise.allSettled([
      getQuote(symbol),
      getCompanyProfile(symbol),
    ])

    if (quote.status !== 'fulfilled' || quote.value === null) return null

    const q = quote.value
    const p = profile.status === 'fulfilled' ? profile.value : null
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return null

    return {
      asset: {
        symbol,
        name:          p?.name ?? symbol,
        type:          'stock',
        price,
        change:        q.price > 0 ? q.change        : 0,
        changePercent: q.price > 0 ? q.changePercent : 0,
        currency:      p?.currency ?? 'USD',
        open:          q.open  > 0 ? q.open  : price,
        high:          q.high  > 0 ? q.high  : price,
        low:           q.low   > 0 ? q.low   : price,
      },
      logoUrl:  p?.logo       || undefined,
      exchange: p?.exchange   || undefined,
      industry: p?.finnhubIndustry || undefined,
    }
  } catch {
    return null
  }
}

async function getEtfData(symbol: string): Promise<{
  asset: AssetCardData
  logoUrl?: string
} | null> {
  try {
    const q = await getQuote(symbol)
    if (q === null) return null
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return null
    return {
      asset: {
        symbol,
        name:          symbol,
        type:          'etf',
        price,
        change:        q.price > 0 ? q.change        : 0,
        changePercent: q.price > 0 ? q.changePercent : 0,
        currency:      'USD',
        open:          q.open  > 0 ? q.open  : price,
        high:          q.high  > 0 ? q.high  : price,
        low:           q.low   > 0 ? q.low   : price,
      },
    }
  } catch {
    return null
  }
}

async function getCryptoData(symbol: string): Promise<{
  asset: AssetCardData
  logoUrl?: string
} | null> {
  const cgId = CRYPTO_SYMBOL_TO_CG_ID[symbol.toUpperCase()]
  if (!cgId) return null

  try {
    const detail = await getCryptoDetail(cgId)
    const md     = detail.market_data
    const price  = md.current_price['usd'] ?? 0
    if (price <= 0) return null

    return {
      asset: {
        symbol:        symbol.toUpperCase(),
        name:          detail.name,
        type:          'crypto',
        price,
        change:        md.price_change_24h,
        changePercent: md.price_change_percentage_24h,
        currency:      'USD',
        open:          price - md.price_change_24h,
        high:          md.high_24h['usd'] ?? price,
        low:           md.low_24h['usd']  ?? price,
      },
      logoUrl: detail.image.large || undefined,
    }
  } catch {
    return null
  }
}

async function getForexData(symbol: string): Promise<{ asset: AssetCardData } | null> {
  try {
    const cards = await getForexCards()
    const card  = cards.find((c) => c.symbol === decodeURIComponent(symbol))
    if (!card) return null
    return { asset: card }
  } catch {
    return null
  }
}

async function getCommodityData(symbol: string): Promise<{ asset: AssetCardData } | null> {
  try {
    const q = await getQuote(symbol)
    if (q === null) return null
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return null
    return {
      asset: {
        symbol,
        name:          symbol,
        type:          'commodity',
        price,
        change:        q.price > 0 ? q.change        : 0,
        changePercent: q.price > 0 ? q.changePercent : 0,
        currency:      'USD',
        open:          q.open  > 0 ? q.open  : price,
        high:          q.high  > 0 ? q.high  : price,
        low:           q.low   > 0 ? q.low   : price,
      },
    }
  } catch {
    return null
  }
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function AssetPage({ params }: AssetPageProps) {
  const { type, symbol: rawSymbol } = await params
  const symbol = decodeURIComponent(rawSymbol)

  const VALID_TYPES: AssetType[] = ['stock', 'crypto', 'forex', 'commodity', 'etf']
  if (!VALID_TYPES.includes(type)) notFound()

  // ── Fetch quote on the server ──────────────────────────────────────────
  let assetData: { asset: AssetCardData; logoUrl?: string; exchange?: string; industry?: string } | null = null

  if (type === 'stock')     assetData = await getStockData(symbol)
  if (type === 'etf')       assetData = await getEtfData(symbol)
  if (type === 'crypto')    assetData = await getCryptoData(symbol)
  if (type === 'forex')     assetData = await getForexData(symbol)
  if (type === 'commodity') assetData = await getCommodityData(symbol)

  if (!assetData) notFound()

  const { asset, logoUrl, exchange, industry } = assetData

  // Which sections to show
  const showFinancials = type === 'stock'
  const showAnalyst    = type === 'stock'
  const showSentiment  = true // all types

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* ── Asset header — constrained width ── */}
      <div className="mx-auto max-w-screen-xl px-4 pt-6 pb-0 sm:px-6">
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <AssetHeader
            asset={asset}
            logoUrl={logoUrl}
            exchange={exchange}
            industry={industry}
          />
        </div>
      </div>

      {/* ── Chart — FULL WIDTH, no horizontal constraints ── */}
      <div className="w-full border-b border-[var(--border)]">
        <TradingViewChart symbol={symbol} type={type} />
      </div>

      {/* ── Content — constrained width ── */}
      <main className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Main column (2/3) */}
          <div className="space-y-5 lg:col-span-2">
            <Suspense fallback={<SectionSkeleton rows={6} />}>
              <NewsSection symbol={symbol} type={type} />
            </Suspense>

            {showFinancials && (
              <Suspense fallback={<SectionSkeleton rows={8} />}>
                <FinancialsTable symbol={symbol} />
              </Suspense>
            )}
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-5">
            {showSentiment && (
              <SentimentCard symbol={symbol} type={type} />
            )}

            {showAnalyst && (
              <Suspense fallback={<SectionSkeleton rows={4} />}>
                <AnalystRatings symbol={symbol} />
              </Suspense>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
