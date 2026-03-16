import { cachedFetch, cacheKey } from '@/lib/cache/redis'
import { TTL, COINGECKO_BASE_URL } from '@/lib/utils/constants'
import { Asset, CryptoMarket } from '@/lib/utils/types'

// ─── Internal helpers ─────────────────────────────────────────────────────

async function cgGet<T>(path: string): Promise<T> {
  const url = `${COINGECKO_BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next:    { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`CoinGecko ${path} → HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─── Raw CoinGecko response shapes ───────────────────────────────────────

interface CgCoin {
  id:                                string
  symbol:                            string
  name:                              string
  image:                             string
  current_price:                     number
  market_cap:                        number
  market_cap_rank:                   number
  fully_diluted_valuation:           number | null
  total_volume:                      number
  high_24h:                          number
  low_24h:                           number
  price_change_24h:                  number
  price_change_percentage_24h:       number
  circulating_supply:                number
  total_supply:                      number | null
  max_supply:                        number | null
  ath:                               number
  ath_change_percentage:             number
  atl:                               number
  atl_change_percentage:             number
}

interface CgCoinDetail {
  id:                   string
  symbol:               string
  name:                 string
  description:          { en: string }
  image:                { thumb: string; small: string; large: string }
  market_cap_rank:      number
  links:                {
    homepage:           string[]
    blockchain_site:    string[]
    twitter_screen_name: string
    subreddit_url:      string
  }
  market_data: {
    current_price:            Record<string, number>
    market_cap:               Record<string, number>
    total_volume:             Record<string, number>
    high_24h:                 Record<string, number>
    low_24h:                  Record<string, number>
    price_change_24h:         number
    price_change_percentage_24h: number
    circulating_supply:       number
    total_supply:             number | null
    max_supply:               number | null
    ath:                      Record<string, number>
    ath_change_percentage:    Record<string, number>
    atl:                      Record<string, number>
    atl_change_percentage:    Record<string, number>
  }
}

interface CgSearchResult {
  coins: Array<{
    id:            string
    name:          string
    api_symbol:    string
    symbol:        string
    market_cap_rank: number | null
    thumb:         string
    large:         string
  }>
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of coins sorted by market cap.
 * Returns up to 50 coins per page.
 */
export async function getCryptoMarkets(
  page = 1,
  currency = 'usd',
  perPage = 50,
): Promise<CryptoMarket[]> {
  return cachedFetch(
    cacheKey.cryptoMarkets(page),
    TTL.CRYPTO_MARKETS,
    async () => {
      const data = await cgGet<CgCoin[]>(
        `/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false`,
      )

      return data.map((c): CryptoMarket => ({
        id:                       c.id,
        symbol:                   c.symbol.toUpperCase(),
        name:                     c.name,
        image:                    c.image,
        currentPrice:             c.current_price,
        marketCap:                c.market_cap,
        marketCapRank:            c.market_cap_rank,
        fullyDilutedValuation:    c.fully_diluted_valuation,
        totalVolume:              c.total_volume,
        high24h:                  c.high_24h,
        low24h:                   c.low_24h,
        priceChange24h:           c.price_change_24h,
        priceChangePercent24h:    c.price_change_percentage_24h,
        circulatingSupply:        c.circulating_supply,
        totalSupply:              c.total_supply,
        maxSupply:                c.max_supply,
        ath:                      c.ath,
        athChangePercent:         c.ath_change_percentage,
        atl:                      c.atl,
        atlChangePercent:         c.atl_change_percentage,
      }))
    },
  )
}

/**
 * Fetch detailed information about a single coin by its CoinGecko ID.
 */
export async function getCryptoDetail(
  id: string,
  currency = 'usd',
): Promise<CgCoinDetail> {
  return cachedFetch(
    cacheKey.cryptoDetail(id),
    TTL.CRYPTO_DETAIL,
    () =>
      cgGet<CgCoinDetail>(
        `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&vs_currency=${currency}`,
      ),
  )
}

/**
 * Search for coins by name or symbol.
 */
export async function searchCrypto(query: string): Promise<Asset[]> {
  return cachedFetch(
    cacheKey.search(query, 'crypto'),
    TTL.SEARCH,
    async () => {
      const data = await cgGet<CgSearchResult>(
        `/search?query=${encodeURIComponent(query)}`,
      )

      return data.coins.slice(0, 20).map((c): Asset => ({
        symbol:   c.symbol.toUpperCase(),
        name:     c.name,
        type:     'crypto',
        logoUrl:  c.large,
      }))
    },
  )
}

/**
 * Fetch market data for a specific set of CoinGecko IDs in a single request.
 * Used by /api/quotes to handle BINANCE: crypto symbols without hitting Finnhub.
 */
export async function getCryptoByIds(
  ids: string[],
  currency = 'usd',
): Promise<CryptoMarket[]> {
  if (ids.length === 0) return []
  const idParam = ids.join(',')
  return cachedFetch(
    `crypto:ids:${idParam}`,
    TTL.CRYPTO_MARKETS,
    () =>
      cgGet<CgCoin[]>(
        `/coins/markets?vs_currency=${currency}&ids=${encodeURIComponent(idParam)}&order=market_cap_desc&sparkline=false`,
      ).then((data) =>
        data.map((c): CryptoMarket => ({
          id:                    c.id,
          symbol:                c.symbol.toUpperCase(),
          name:                  c.name,
          image:                 c.image,
          currentPrice:          c.current_price,
          marketCap:             c.market_cap,
          marketCapRank:         c.market_cap_rank,
          fullyDilutedValuation: c.fully_diluted_valuation,
          totalVolume:           c.total_volume,
          high24h:               c.high_24h,
          low24h:                c.low_24h,
          priceChange24h:        c.price_change_24h,
          priceChangePercent24h: c.price_change_percentage_24h,
          circulatingSupply:     c.circulating_supply,
          totalSupply:           c.total_supply,
          maxSupply:             c.max_supply,
          ath:                   c.ath,
          athChangePercent:      c.ath_change_percentage,
          atl:                   c.atl,
          atlChangePercent:      c.atl_change_percentage,
        })),
      ),
  )
}
