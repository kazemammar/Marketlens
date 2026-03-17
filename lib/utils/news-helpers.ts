// ─── Shared news categorization & keyword utilities ───────────────────────

export type NewsCategory = 'GEOPOLITICAL' | 'ENERGY' | 'CRYPTO' | 'TECH' | 'MARKETS'

export function categorizeArticle(headline: string): NewsCategory {
  const h = headline.toLowerCase()

  // ENERGY & COMMODITIES — must run BEFORE geopolitical so that oil/gas/commodity
  // articles mentioning Iran, Russia, Ukraine etc. land here, not in GEOPOLITICAL
  if (/\boil\b|crude oil|petroleum|\bopec\b|\bbrent\b|\bwti\b|\bbarrels?\b|refin(ery|ing)|\blng\b|natural gas|\bgas price|\bgas supply|\bfuel\b|\bdiesel\b|\bgasoline\b|\bcoal\b|\buranium\b|\bgold\b|\bsilver\b|\bcopper\b|\bwheat\b|\bcorn\b|soybean|commodit|commodity|commodities|\bpipeline\b|\bshale\b|energy sector|energy (stock|price|market|supply|crisis)|oil (price|market|supply|output|production|demand)|oil sanction|gas (price|market|supply)|energy transition|renewable energy|\bsolar\b|\bwind (energy|power|farm|turbine)\b/.test(h)) return 'ENERGY'

  // CRYPTO
  if (/bitcoin|ethereum|\bbtc\b|\beth\b|crypto(currency)?|blockchain|\bdefi\b|\bnft\b|altcoin|binance|coinbase|solana|\bxrp\b|ripple/.test(h)) return 'CRYPTO'

  // GEOPOLITICAL — energy articles with geo actors already captured above
  if (/iran|israel|russia|ukraine|\bwar\b|military|nato|sanction|missile|attack|conflict|houthi|gaza|troops|ceasefire|coup|invasion|airstrike|geopolit|taiwan strait|north korea|nuclear weapon|blockade|terrorist/.test(h)) return 'GEOPOLITICAL'

  // TECH
  if (/\bai\b|artificial intelligence|nvidia|semiconductor|\bchips?\b|openai|chatgpt|tech stock|big tech|software (company|startup)|cloud computing|silicon valley/.test(h)) return 'TECH'

  return 'MARKETS'
}

export const CAT_BADGE: Record<NewsCategory, string> = {
  GEOPOLITICAL: 'text-red-400 bg-red-500/10 border-red-500/25',
  ENERGY:       'text-orange-400 bg-orange-500/10 border-orange-500/25',
  TECH:         'text-blue-400 bg-blue-500/10 border-blue-500/25',
  CRYPTO:       'text-purple-400 bg-purple-500/10 border-purple-500/25',
  MARKETS:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
}

export const CAT_LABEL: Record<NewsCategory, string> = {
  GEOPOLITICAL: 'GEO',
  ENERGY:       'ENERGY',
  TECH:         'TECH',
  CRYPTO:       'CRYPTO',
  MARKETS:      'MKTS',
}

// ─── Asset keyword map ────────────────────────────────────────────────────

export function getAssetKeywords(symbol: string, type: string): string[] {
  const keywordMap: Record<string, string[]> = {
    // Stocks
    'AAPL':    ['apple', 'iphone', 'ipad', 'mac', 'app store', 'tim cook', 'foxconn', 'tsmc', 'consumer electronics', 'big tech'],
    'MSFT':    ['microsoft', 'azure', 'windows', 'openai', 'github', 'cloud computing', 'enterprise software', 'satya nadella'],
    'GOOGL':   ['google', 'alphabet', 'youtube', 'android', 'search engine', 'advertising', 'big tech', 'gemini', 'deepmind'],
    'AMZN':    ['amazon', 'aws', 'e-commerce', 'prime', 'jassy', 'cloud computing', 'big tech'],
    'NVDA':    ['nvidia', 'gpu', 'data center', 'jensen huang', 'cuda', 'semiconductor', 'h100', 'blackwell', 'ai chip'],
    'META':    ['meta', 'facebook', 'instagram', 'whatsapp', 'metaverse', 'social media', 'zuckerberg'],
    'TSLA':    ['tesla', 'electric vehicle', ' ev ', 'elon musk', 'autopilot', 'battery', 'model 3', 'model y', 'cybertruck'],
    'JPM':     ['jpmorgan', 'jamie dimon', 'banking', 'wall street', 'interest rate', 'financial'],
    'XOM':     ['exxon', 'oil', 'crude', 'petroleum', 'refinery', 'opec', 'fossil fuel', 'energy'],
    'V':       ['visa', 'payment', 'credit card', 'fintech', 'digital payment', 'transaction'],
    'BAC':     ['bank of america', 'banking', 'wall street', 'interest rate', 'financial', 'mortgage'],
    'COIN':    ['coinbase', 'crypto', 'bitcoin', 'exchange', 'sec', 'regulation'],
    'MSTR':    ['microstrategy', 'bitcoin', 'michael saylor', 'btc'],
    // Commodities
    'USO':     ['crude oil', 'wti', 'oil price', 'opec', 'iran', 'hormuz', 'saudi', 'petroleum', 'barrel', 'refinery', 'energy', 'shale', 'pipeline', 'tanker', 'sanctions', 'middle east'],
    'GLD':     ['gold', 'precious metal', 'safe haven', 'inflation hedge', 'central bank', 'bullion', 'mining', 'fed', 'dollar', 'treasury'],
    'SLV':     ['silver', 'precious metal', 'industrial metal', 'solar', 'mining', 'inflation'],
    'UNG':     ['natural gas', 'lng', 'pipeline', 'heating', 'storage', 'henry hub', 'europe gas', 'energy'],
    'WEAT':    ['wheat', 'grain', 'agriculture', 'ukraine', 'black sea', 'drought', 'food', 'export ban'],
    'CORN':    ['corn', 'maize', 'grain', 'agriculture', 'ethanol', 'farming', 'drought'],
    'CPER':    ['copper', 'industrial metal', 'mining', 'construction', 'ev', 'infrastructure', 'china demand'],
    'PPLT':    ['platinum', 'precious metal', 'automotive', 'catalytic', 'mining', 'south africa'],
    // Crypto
    'BTC':     ['bitcoin', 'btc', 'crypto', 'blockchain', 'mining', 'halving', 'etf', 'institutional', 'digital currency', 'inflation'],
    'ETH':     ['ethereum', 'eth', 'defi', 'smart contract', 'staking', 'layer 2', 'nft', 'vitalik'],
    'SOL':     ['solana', 'sol', 'defi', 'nft', 'blockchain', 'layer 1', 'crypto'],
    'BNB':     ['binance', 'bnb', 'crypto exchange', 'cz', 'blockchain', 'defi'],
    'XRP':     ['ripple', 'xrp', 'sec', 'payment', 'cross-border', 'blockchain'],
    'DOGE':    ['dogecoin', 'doge', 'elon musk', 'meme coin', 'crypto', 'twitter'],
    // Forex
    'EUR/USD': ['euro', 'ecb', 'european', 'eurozone', 'fed', 'dollar', 'interest rate', 'inflation', 'gdp'],
    'USD/JPY': ['yen', 'japan', 'boj', 'bank of japan', 'fed', 'dollar', 'carry trade', 'intervention'],
    'GBP/USD': ['pound', 'sterling', 'bank of england', 'boe', 'uk economy', 'brexit', 'dollar'],
    'USD/CHF': ['swiss franc', 'switzerland', 'snb', 'safe haven', 'dollar', 'fed'],
    'AUD/USD': ['australia', 'rba', 'commodity', 'iron ore', 'china', 'dollar'],
    'USD/CAD': ['canada', 'boc', 'oil', 'loonie', 'dollar', 'trade'],
    // ETFs
    'SPY':     ['s&p 500', 'stock market', 'wall street', 'fed', 'earnings', 'recession', 'bull market', 'bear market'],
    'QQQ':     ['nasdaq', 'tech stocks', 'big tech', 'growth stocks', 'ai', 'semiconductor'],
    'TLT':     ['treasury', 'bonds', 'yield', 'interest rate', 'fed', 'inflation', 'fixed income'],
    'GDX':     ['gold miners', 'gold', 'mining', 'precious metals', 'inflation'],
    'XLE':     ['energy sector', 'oil', 'natural gas', 'exxon', 'chevron', 'opec'],
    'XLF':     ['financial sector', 'banking', 'fed', 'interest rate', 'wall street'],
    'ARKK':    ['innovation', 'disruptive', 'ark invest', 'cathie wood', 'growth', 'biotech'],
    'IWM':     ['small cap', 'russell 2000', 'domestic', 'economy', 'rate cut'],
  }

  if (keywordMap[symbol]) return keywordMap[symbol]

  const typeKeywords: Record<string, string[]> = {
    stock:     [symbol.toLowerCase(), 'earnings', 'revenue', 'stock market'],
    crypto:    [symbol.toLowerCase(), 'crypto', 'blockchain', 'bitcoin'],
    forex:     [symbol.toLowerCase().replace('/', ' '), 'currency', 'exchange rate', 'central bank'],
    commodity: [symbol.toLowerCase(), 'commodity', 'supply', 'demand'],
    etf:       [symbol.toLowerCase(), 'etf', 'fund', 'index'],
  }

  return typeKeywords[type] ?? [symbol.toLowerCase()]
}
