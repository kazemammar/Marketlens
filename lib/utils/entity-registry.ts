export interface Entity {
  id:           string
  name:         string
  type:         'company' | 'commodity' | 'index' | 'sector' | 'crypto'
  sector?:      string
  searchTerms:  string[]
  competitors?: string[]
}

export const ENTITY_REGISTRY: Record<string, Entity> = {
  // ── Major Stocks ───────────────────────────────────────────────────────────
  AAPL:  { id: 'AAPL',  name: 'Apple',            type: 'company', sector: 'technology',
           searchTerms: ['apple', 'iphone', 'ipad', 'tim cook', 'app store', 'vision pro', 'mac'] },
  MSFT:  { id: 'MSFT',  name: 'Microsoft',         type: 'company', sector: 'technology',
           searchTerms: ['microsoft', 'azure', 'windows', 'openai', 'satya nadella', 'copilot', 'xbox'] },
  NVDA:  { id: 'NVDA',  name: 'Nvidia',            type: 'company', sector: 'semiconductors',
           searchTerms: ['nvidia', 'nvda', 'jensen huang', 'h100', 'blackwell', 'ai chip', 'cuda', 'gpu'],
           competitors: ['AMD', 'INTC', 'AVGO'] },
  TSLA:  { id: 'TSLA',  name: 'Tesla',             type: 'company', sector: 'consumer',
           searchTerms: ['tesla', 'elon musk', 'cybertruck', 'model y', 'model 3', 'electric vehicle', 'ev tariff', 'autopilot'] },
  META:  { id: 'META',  name: 'Meta',              type: 'company', sector: 'technology',
           searchTerms: ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg', 'metaverse', 'threads', 'reels'] },
  GOOGL: { id: 'GOOGL', name: 'Alphabet',          type: 'company', sector: 'technology',
           searchTerms: ['google', 'alphabet', 'youtube', 'android', 'gemini', 'deepmind', 'waymo', 'search'] },
  AMZN:  { id: 'AMZN',  name: 'Amazon',            type: 'company', sector: 'technology',
           searchTerms: ['amazon', 'aws', 'prime', 'andy jassy', 'e-commerce', 'alexa', 'fulfillment'] },
  JPM:   { id: 'JPM',   name: 'JPMorgan',          type: 'company', sector: 'finance',
           searchTerms: ['jpmorgan', 'jp morgan', 'jamie dimon', 'chase bank'],
           competitors: ['GS', 'MS', 'BAC'] },
  GS:    { id: 'GS',    name: 'Goldman Sachs',     type: 'company', sector: 'finance',
           searchTerms: ['goldman sachs', 'goldman', 'david solomon'] },
  MS:    { id: 'MS',    name: 'Morgan Stanley',    type: 'company', sector: 'finance',
           searchTerms: ['morgan stanley'] },
  BAC:   { id: 'BAC',   name: 'Bank of America',   type: 'company', sector: 'finance',
           searchTerms: ['bank of america', 'bofa'] },

  // ── Energy Companies ───────────────────────────────────────────────────────
  XOM:   { id: 'XOM',   name: 'ExxonMobil',        type: 'company', sector: 'energy',
           searchTerms: ['exxon', 'exxonmobil', 'oil major', 'refinery'] },
  CVX:   { id: 'CVX',   name: 'Chevron',           type: 'company', sector: 'energy',
           searchTerms: ['chevron', 'oil major'] },
  COP:   { id: 'COP',   name: 'ConocoPhillips',    type: 'company', sector: 'energy',
           searchTerms: ['conocophillips', 'conoco'] },

  // ── Defense ────────────────────────────────────────────────────────────────
  LMT:   { id: 'LMT',   name: 'Lockheed Martin',   type: 'company', sector: 'defense',
           searchTerms: ['lockheed martin', 'lockheed', 'f-35', 'defense contract'] },
  RTX:   { id: 'RTX',   name: 'RTX/Raytheon',      type: 'company', sector: 'defense',
           searchTerms: ['raytheon', 'rtx', 'patriot missile', 'defense'] },
  BA:    { id: 'BA',    name: 'Boeing',             type: 'company', sector: 'industrial',
           searchTerms: ['boeing', '737 max', '787', 'aircraft', 'faa'] },

  // ── Healthcare ─────────────────────────────────────────────────────────────
  LLY:   { id: 'LLY',   name: 'Eli Lilly',         type: 'company', sector: 'healthcare',
           searchTerms: ['eli lilly', 'lilly', 'ozempic', 'mounjaro', 'glp-1', 'weight loss drug'] },
  UNH:   { id: 'UNH',   name: 'UnitedHealth',      type: 'company', sector: 'healthcare',
           searchTerms: ['unitedhealth', 'united health', 'optum', 'health insurance'] },

  // ── Semiconductors ─────────────────────────────────────────────────────────
  AMD:   { id: 'AMD',   name: 'AMD',               type: 'company', sector: 'semiconductors',
           searchTerms: ['amd', 'advanced micro', 'ryzen', 'epyc', 'radeon', 'lisa su'] },
  INTC:  { id: 'INTC',  name: 'Intel',             type: 'company', sector: 'semiconductors',
           searchTerms: ['intel', 'foundry', 'pat gelsinger', 'chip act'] },
  AVGO:  { id: 'AVGO',  name: 'Broadcom',          type: 'company', sector: 'semiconductors',
           searchTerms: ['broadcom', 'avgo', 'vmware', 'ai chip', 'networking chip'] },

  // ── Indices ────────────────────────────────────────────────────────────────
  SPY:   { id: 'SPY',   name: 'S&P 500',           type: 'index',
           searchTerms: ['s&p 500', 'sp500', 'wall street', 'stock market', 'market rally', 'market sell-off', 'broad market'] },
  QQQ:   { id: 'QQQ',   name: 'Nasdaq 100',        type: 'index',
           searchTerms: ['nasdaq', 'tech stocks', 'technology sector', 'big tech'] },
  VXX:   { id: 'VXX',   name: 'VIX',              type: 'index',
           // VIX is derivative — it spikes when markets sell off.
           // Search terms must match what actually appears in fear-driven headlines.
           searchTerms: ['vix', 'volatility', 'market selloff', 'markets tumble', 'stocks plunge',
                         'recession fears', 'risk aversion', 'panic selling', 'market turmoil',
                         'investors flee', 'markets fall', 'stocks fall', 'market panic'] },

  // ── Commodities ────────────────────────────────────────────────────────────
  GLD:   { id: 'GLD',   name: 'Gold',              type: 'commodity',
           searchTerms: ['gold price', 'bullion', 'precious metals', 'safe haven gold', 'gold demand'] },
  USO:   { id: 'USO',   name: 'WTI Crude',         type: 'commodity',
           searchTerms: ['wti crude', 'oil price', 'crude oil', 'opec output', 'oil supply', 'us oil', 'drilling'] },
  BNO:   { id: 'BNO',   name: 'Brent Crude',       type: 'commodity',
           searchTerms: ['brent crude', 'brent oil', 'oil price', 'opec', 'north sea', 'oil supply'] },
  UNG:   { id: 'UNG',   name: 'Natural Gas',       type: 'commodity',
           searchTerms: ['natural gas', 'gas price', 'lng', 'gas supply', 'heating demand', 'gas storage'] },
  TLT:   { id: 'TLT',   name: 'US Bonds',          type: 'commodity',
           searchTerms: ['treasury yield', 'bond yield', '10-year yield', 'fed rate decision', 'fomc meeting', 'interest rate hike', 'rate cut'] },
  WEAT:  { id: 'WEAT',  name: 'Wheat',             type: 'commodity',
           searchTerms: ['wheat price', 'grain supply', 'harvest outlook', 'food prices', 'agriculture drought', 'crop'] },
  SLV:   { id: 'SLV',   name: 'Silver',            type: 'commodity',
           searchTerms: ['silver price', 'precious metals', 'industrial silver', 'silver demand'] },

  // ── More Mega-Caps ─────────────────────────────────────────────────────────
  NFLX:  { id: 'NFLX',  name: 'Netflix',           type: 'company', sector: 'communication',
           searchTerms: ['netflix', 'streaming', 'subscriber', 'ted sarandos'] },
  V:     { id: 'V',     name: 'Visa',              type: 'company', sector: 'finance',
           searchTerms: ['visa', 'payment', 'credit card', 'digital payments'] },
  MA:    { id: 'MA',    name: 'Mastercard',        type: 'company', sector: 'finance',
           searchTerms: ['mastercard', 'payment', 'credit card'] },
  CRM:   { id: 'CRM',   name: 'Salesforce',        type: 'company', sector: 'technology',
           searchTerms: ['salesforce', 'crm', 'marc benioff', 'cloud software'] },
  COST:  { id: 'COST',  name: 'Costco',            type: 'company', sector: 'consumer',
           searchTerms: ['costco', 'wholesale', 'retail', 'membership'] },
  PG:    { id: 'PG',    name: 'Procter & Gamble',  type: 'company', sector: 'consumer',
           searchTerms: ['procter', 'p&g', 'consumer goods', 'tide', 'pampers'] },
  KO:    { id: 'KO',    name: 'Coca-Cola',         type: 'company', sector: 'consumer',
           searchTerms: ['coca-cola', 'coca cola', 'coke', 'beverage'] },
  PEP:   { id: 'PEP',   name: 'PepsiCo',           type: 'company', sector: 'consumer',
           searchTerms: ['pepsi', 'pepsico', 'frito-lay', 'snack', 'beverage'] },
  DIS:   { id: 'DIS',   name: 'Disney',            type: 'company', sector: 'communication',
           searchTerms: ['disney', 'disney+', 'marvel', 'pixar', 'bob iger', 'theme park'] },
  ABBV:  { id: 'ABBV',  name: 'AbbVie',            type: 'company', sector: 'healthcare',
           searchTerms: ['abbvie', 'humira', 'skyrizi', 'pharmaceutical'] },
  WMT:   { id: 'WMT',   name: 'Walmart',           type: 'company', sector: 'consumer',
           searchTerms: ['walmart', 'retail', 'e-commerce', 'grocery'] },
  HD:    { id: 'HD',    name: 'Home Depot',        type: 'company', sector: 'consumer',
           searchTerms: ['home depot', 'housing', 'home improvement', 'renovation'] },
  MRK:   { id: 'MRK',   name: 'Merck',             type: 'company', sector: 'healthcare',
           searchTerms: ['merck', 'keytruda', 'pharmaceutical', 'oncology'] },
  ORCL:  { id: 'ORCL',  name: 'Oracle',            type: 'company', sector: 'technology',
           searchTerms: ['oracle', 'cloud database', 'larry ellison', 'enterprise software'] },
  ADBE:  { id: 'ADBE',  name: 'Adobe',             type: 'company', sector: 'technology',
           searchTerms: ['adobe', 'photoshop', 'creative cloud', 'figma', 'pdf'] },
  TMO:   { id: 'TMO',   name: 'Thermo Fisher',     type: 'company', sector: 'healthcare',
           searchTerms: ['thermo fisher', 'scientific instruments', 'life science'] },
  ABT:   { id: 'ABT',   name: 'Abbott',            type: 'company', sector: 'healthcare',
           searchTerms: ['abbott', 'medical devices', 'diagnostics', 'glucose monitor'] },
  HON:   { id: 'HON',   name: 'Honeywell',         type: 'company', sector: 'industrial',
           searchTerms: ['honeywell', 'aerospace', 'industrial automation', 'building tech'] },
  CAT:   { id: 'CAT',   name: 'Caterpillar',       type: 'company', sector: 'industrial',
           searchTerms: ['caterpillar', 'construction equipment', 'mining equipment', 'infrastructure'] },
  DE:    { id: 'DE',    name: 'Deere & Co.',       type: 'company', sector: 'industrial',
           searchTerms: ['deere', 'john deere', 'farm equipment', 'agriculture machinery'] },
  GE:    { id: 'GE',    name: 'GE Aerospace',      type: 'company', sector: 'industrial',
           searchTerms: ['ge aerospace', 'general electric', 'aircraft engine', 'jet engine'] },
  PYPL:  { id: 'PYPL',  name: 'PayPal',            type: 'company', sector: 'finance',
           searchTerms: ['paypal', 'venmo', 'digital payments', 'buy now pay later'] },
  SPOT:  { id: 'SPOT',  name: 'Spotify',           type: 'company', sector: 'communication',
           searchTerms: ['spotify', 'music streaming', 'podcasts', 'audio streaming'] },
  UBER:  { id: 'UBER',  name: 'Uber',              type: 'company', sector: 'industrial',
           searchTerms: ['uber', 'rideshare', 'delivery', 'dara khosrowshahi', 'autonomous vehicles'] },

  // ── Sector ETFs ────────────────────────────────────────────────────────────
  XLE:   { id: 'XLE',   name: 'Energy Sector',     type: 'sector', sector: 'energy',
           searchTerms: ['energy sector', 'oil stocks', 'energy stocks', 'oil companies'] },
  XLF:   { id: 'XLF',   name: 'Financials',        type: 'sector', sector: 'finance',
           searchTerms: ['bank stocks', 'financial sector', 'banking sector', 'bank earnings'] },
  XLK:   { id: 'XLK',   name: 'Technology Sector', type: 'sector', sector: 'technology',
           searchTerms: ['tech stocks', 'technology sector', 'software stocks', 'chip stocks'] },
  XLV:   { id: 'XLV',   name: 'Healthcare Sector', type: 'sector', sector: 'healthcare',
           searchTerms: ['healthcare stocks', 'pharma stocks', 'biotech sector', 'health insurance'] },
  XLI:   { id: 'XLI',   name: 'Industrial Sector', type: 'sector', sector: 'industrial',
           searchTerms: ['industrial stocks', 'manufacturing', 'defense stocks', 'aerospace sector'] },
  XLP:   { id: 'XLP',   name: 'Consumer Staples',  type: 'sector', sector: 'consumer',
           searchTerms: ['consumer staples', 'defensive stocks', 'food stocks', 'household goods'] },
  XLRE:  { id: 'XLRE',  name: 'Real Estate Sector',type: 'sector', sector: 'real estate',
           searchTerms: ['real estate stocks', 'reit', 'property sector', 'real estate investment'] },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  BTC:   { id: 'BTC',   name: 'Bitcoin',           type: 'crypto',
           searchTerms: ['bitcoin', 'btc', 'crypto', 'satoshi', 'halving', 'bitcoin etf'] },
  ETH:   { id: 'ETH',   name: 'Ethereum',          type: 'crypto',
           searchTerms: ['ethereum', 'eth', 'vitalik', 'smart contract', 'defi', 'layer 2'] },
  SOL:   { id: 'SOL',   name: 'Solana',            type: 'crypto',
           searchTerms: ['solana', 'sol', 'solana network', 'solana meme coins'] },
}

export function getEntity(symbol: string): Entity | undefined {
  return ENTITY_REGISTRY[symbol]
}
