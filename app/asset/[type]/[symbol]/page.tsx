import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AssetType, AssetCardData } from '@/lib/utils/types'
import { CRYPTO_SYMBOL_TO_CG_ID } from '@/lib/utils/constants'
import { getQuote, getCompanyProfile } from '@/lib/api/finnhub'
import { getCryptoDetail } from '@/lib/api/coingecko'
import { getForexCards } from '@/lib/api/forex'
import { getYahooQuote } from '@/lib/api/yahoo'
import { DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import AssetHeader from '@/components/asset/AssetHeader'
import TradingViewChart from '@/components/asset/TradingViewChart'
import NewsSection from '@/components/asset/NewsSection'
import FinancialsTable from '@/components/asset/FinancialsTable'
import AnalystRatings from '@/components/asset/AnalystRatings'
import SentimentCard from '@/components/asset/SentimentCard'
import PeersTable from '@/components/asset/PeersTable'
import InsiderActivity from '@/components/asset/InsiderActivity'
import TechnicalSummary from '@/components/asset/TechnicalSummary'
import AssetContext from '@/components/asset/AssetContext'
import CryptoStats    from '@/components/asset/CryptoStats'
import FearGreedGauge from '@/components/asset/FearGreedGauge'
import DefiTvl        from '@/components/asset/DefiTvl'
import RelatedAssets  from '@/components/asset/RelatedAssets'
import CommodityIntel    from '@/components/asset/CommodityIntel'
import ForexStrength     from '@/components/asset/ForexStrength'
import ForexCentralBanks from '@/components/asset/ForexCentralBanks'
import EtfOverview       from '@/components/asset/EtfOverview'
import EtfHoldings       from '@/components/asset/EtfHoldings'
import EarningsHistory   from '@/components/asset/EarningsHistory'

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

  const TYPE_LABELS: Record<string, string> = {
    stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodity', etf: 'ETF',
  }
  const typeLabel   = TYPE_LABELS[type] ?? type
  const title       = `${symbol.toUpperCase()} — ${name}`
  const description = `Live ${typeLabel.toLowerCase()} data, AI-powered sentiment analysis, and news for ${name} (${symbol.toUpperCase()}) on MarketLens.`
  const ogTitle     = `${title} | MarketLens`
  return {
    title,
    description,
    openGraph: {
      title:       ogTitle,
      description,
      url:         `https://marketlens.live/asset/${type}/${encodeURIComponent(symbol)}`,
      images:      [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       ogTitle,
      description: `Real-time ${typeLabel.toLowerCase()} data and AI analysis for ${symbol.toUpperCase()}.`,
      images:      ['/og-image.png'],
    },
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
  const cfg  = DEFAULT_COMMODITIES.find((c) => c.symbol === symbol)
  const name = cfg?.name ?? symbol

  // Futures symbols (contain '=' or '!') → Yahoo Finance
  if (symbol.includes('=') || symbol.includes('!')) {
    try {
      const q = await getYahooQuote(symbol)
      if (!q || q.price <= 0) return null
      return {
        asset: {
          symbol,
          name,
          type:          'commodity',
          price:         q.price,
          change:        q.change,
          changePercent: q.changePercent,
          currency:      'USD',
          open:          q.price,
          high:          q.price,
          low:           q.price,
        },
      }
    } catch {
      return null
    }
  }

  // Legacy ETF-proxy commodities → Finnhub
  try {
    const q = await getQuote(symbol)
    if (q === null) return null
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return null
    return {
      asset: {
        symbol,
        name,
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
    <div className="space-y-2.5 rounded border border-[var(--border)] bg-[var(--surface)] p-3">
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

      {/* ── Asset header ── */}
      <div className="mx-auto max-w-screen-xl px-4 pt-4 pb-3 sm:px-6">
        <AssetHeader
          asset={asset}
          logoUrl={logoUrl}
          exchange={exchange}
          industry={industry}
        />
      </div>

      {/* ── Chart — constrained to same max-width as page content ── */}
      <div className="mx-auto w-full max-w-screen-xl overflow-hidden px-4 sm:px-6">
        <TradingViewChart symbol={symbol} type={type} />
      </div>

      {/* ── Related Assets — all types ── */}
      <div className="mx-auto mt-2 w-full max-w-screen-xl px-4 sm:px-6">
        <RelatedAssets symbol={symbol} type={type} />
      </div>

      {/* ── Commodity Intelligence (commodity only) ── */}
      {type === 'commodity' && (
        <div className="mx-auto mt-2 w-full max-w-screen-xl px-4 sm:px-6">
          <CommodityIntel symbol={symbol} />
        </div>
      )}

      {/* ── Forex panels (forex only) ── */}
      {type === 'forex' && (
        <div className="mx-auto mt-2 w-full max-w-screen-xl space-y-2 px-4 sm:px-6">
          <ForexStrength symbol={symbol} />
          <ForexCentralBanks symbol={symbol} />
        </div>
      )}

      {/* ── ETF panels (etf only) ── */}
      {type === 'etf' && (
        <div className="mx-auto mt-2 w-full max-w-screen-xl space-y-2 px-4 sm:px-6">
          <EtfOverview symbol={symbol} />
          <EtfHoldings symbol={symbol} />
        </div>
      )}

      {/* ── Peers & Technicals (stock only) — full-width, below chart ── */}
      {type === 'stock' && (
        <div className="mx-auto mt-2 w-full max-w-screen-xl space-y-2 px-4 sm:px-6">
          <PeersTable symbol={symbol} />
          <EarningsHistory symbol={symbol} />
          <TechnicalSummary symbol={symbol} />
        </div>
      )}

      {/* ── Crypto-specific panels ── */}
      {type === 'crypto' && (
        <div className="mx-auto mt-2 w-full max-w-screen-xl px-4 sm:px-6">
          <CryptoStats symbol={symbol} />
        </div>
      )}

      {/* ── Divider ── */}
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* ── Context + Fear & Greed (crypto) / Context alone (others) ── */}
      <div className="mx-auto mt-2 w-full max-w-screen-xl px-4 sm:px-6">
        {type === 'crypto' ? (
          <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-[30fr_70fr]">
            <FearGreedGauge />
            <AssetContext symbol={symbol} type={type} />
          </div>
        ) : (
          <AssetContext symbol={symbol} type={type} />
        )}
      </div>

      {/* ── Divider ── */}
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      {/* ── Content — constrained, tight padding ── */}
      <main className="mx-auto max-w-screen-xl px-4 py-2 sm:px-6">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[65fr_35fr]">
          {/* ── Left 65%: News + Insider Activity (stock only) ── */}
          <div className="col-span-1">
            <Suspense fallback={<SectionSkeleton rows={6} />}>
              <NewsSection symbol={symbol} type={type} />
            </Suspense>
            {type === 'stock' && (
              <InsiderActivity symbol={symbol} />
            )}
          </div>

          {/* ── Right 35%: Sentiment → Analyst → Financials ── */}
          <div className="col-span-1 space-y-2">
            {showSentiment && (
              <SentimentCard symbol={symbol} type={type} />
            )}

            {showAnalyst && (
              <Suspense fallback={<SectionSkeleton rows={4} />}>
                <AnalystRatings symbol={symbol} />
              </Suspense>
            )}

            {showFinancials && (
              <Suspense fallback={<SectionSkeleton rows={8} />}>
                <FinancialsTable symbol={symbol} />
              </Suspense>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
