// ─── Shared news categorization & keyword utilities ───────────────────────

export type NewsCategory = 'GEOPOLITICAL' | 'ENERGY' | 'CRYPTO' | 'TECH' | 'MARKETS'

export function categorizeArticle(headline: string): NewsCategory {
  const h = headline.toLowerCase()
  if (/iran|israel|russia|ukraine|war|military|nato|sanction|missile|attack|conflict|houthi|gaza|troops|ceasefire|coup|invasion|airstrike/.test(h)) return 'GEOPOLITICAL'
  if (/oil|crude|opec|natural gas|energy|pipeline|barrel|refinery|lng|petroleum|brent|wti/.test(h)) return 'ENERGY'
  if (/bitcoin|crypto|btc|eth|blockchain|defi|token|nft|altcoin|binance|coinbase/.test(h)) return 'CRYPTO'
  if (/\bai\b|artificial intelligence|apple|google|nvidia|microsoft|chip|semiconductor|software|openai|meta|big tech|tech stock/.test(h)) return 'TECH'
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
