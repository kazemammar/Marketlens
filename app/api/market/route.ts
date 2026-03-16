// GET /api/market?tab=stock|crypto|forex|commodity|etf
// Returns AssetCardData[] for the requested tab.
// Called lazily by MarketTabs when the user first clicks a tab.

import { NextRequest } from 'next/server'
import { getQuotesBatched } from '@/lib/api/finnhub'
import { getCryptoMarkets } from '@/lib/api/coingecko'
import { getForexCards }    from '@/lib/api/forex'
import {
  DEFAULT_STOCKS,
  DEFAULT_ETFS,
  DEFAULT_COMMODITIES,
} from '@/lib/utils/constants'
import { AssetCardData, AssetType } from '@/lib/utils/types'

// ─── Name maps ────────────────────────────────────────────────────────────

const STOCK_NAMES: Record<string, string> = {
  AAPL:    'Apple Inc.',        MSFT:  'Microsoft Corp.',
  GOOGL:   'Alphabet Inc.',     AMZN:  'Amazon.com',
  NVDA:    'NVIDIA Corp.',      META:  'Meta Platforms',
  TSLA:    'Tesla Inc.',        'BRK.B': 'Berkshire Hathaway',
  JPM:     'JPMorgan Chase',    V:     'Visa Inc.',
  UNH:     'UnitedHealth',      XOM:   'Exxon Mobil',
  JNJ:     'Johnson & Johnson', PG:    'Procter & Gamble',
  MA:      'Mastercard',
}

const ETF_NAMES: Record<string, string> = {
  SPY: 'SPDR S&P 500',       QQQ:  'Invesco Nasdaq 100',
  DIA: 'SPDR Dow Jones',     IWM:  'iShares Russell 2000',
  VTI: 'Vanguard Total Mkt', GLD:  'SPDR Gold Shares',
  SLV: 'iShares Silver',     TLT:  'iShares 20Y+ Treasury',
  VNQ: 'Vanguard Real Est.', ARKK: 'ARK Innovation',
}

// ─── Helper ───────────────────────────────────────────────────────────────

async function quotesToCards(
  symbols:  string[],
  getName:  (s: string) => string,
  type:     AssetType,
  currency = 'USD',
): Promise<AssetCardData[]> {
  const map = await getQuotesBatched(symbols)
  const cards: AssetCardData[] = []

  for (const [sym, q] of map) {
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) continue
    cards.push({
      symbol:        sym,
      name:          getName(sym),
      type,
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency,
      open:  q.open  > 0 ? q.open  : price,
      high:  q.high  > 0 ? q.high  : price,
      low:   q.low   > 0 ? q.low   : price,
    })
  }

  // Preserve the original symbol order
  return symbols
    .map((s) => cards.find((c) => c.symbol === s))
    .filter((c): c is AssetCardData => c !== undefined)
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') as AssetType | null

  try {
    let assets: AssetCardData[] = []

    switch (tab) {
      case 'stock':
        assets = await quotesToCards(
          DEFAULT_STOCKS,
          (s) => STOCK_NAMES[s] ?? s,
          'stock',
        )
        break

      case 'crypto':
        assets = await getCryptoMarkets(1, 'usd', 20).then((coins) =>
          coins.map((c): AssetCardData => ({
            symbol:        c.symbol.toUpperCase(),
            name:          c.name,
            type:          'crypto',
            price:         c.currentPrice,
            change:        c.priceChange24h,
            changePercent: c.priceChangePercent24h,
            currency:      'USD',
            open:          c.currentPrice - c.priceChange24h,
            high:          c.high24h,
            low:           c.low24h,
          })),
        )
        break

      case 'forex':
        assets = await getForexCards()
        break

      case 'commodity':
        assets = await quotesToCards(
          DEFAULT_COMMODITIES.map((c) => c.symbol),
          (s) => DEFAULT_COMMODITIES.find((c) => c.symbol === s)?.name ?? s,
          'commodity',
        )
        break

      case 'etf':
        assets = await quotesToCards(
          DEFAULT_ETFS,
          (s) => ETF_NAMES[s] ?? s,
          'etf',
        )
        break

      default:
        return Response.json({ error: `Unknown tab: "${tab}"` }, { status: 400 })
    }

    console.log(`[/api/market] tab=${tab} → ${assets.length} assets`)
    return Response.json(assets, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
    })
  } catch (err) {
    console.error(`[/api/market] tab=${tab} failed:`, err)
    return Response.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
