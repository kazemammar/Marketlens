export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
// ─── Static ETF holdings data ─────────────────────────────────────────────
// Source: fund prospectuses / public filings (approximate weights, updated periodically)
// All live APIs for this data are paywalled — FMP v3 legacy (sunset Aug 2025),
// FMP stable /etf/holdings = "Restricted", Finnhub ETF = premium-only.

interface Holding  { symbol: string; name: string; weight: number }
interface Sector   { sector: string; weight: number }
interface EtfBlob  { holdings: Holding[]; sectors: Sector[] }

const ETF_STATIC: Record<string, EtfBlob> = {
  SPY: {
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',               weight: 7.10 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp.',              weight: 6.80 },
      { symbol: 'MSFT',  name: 'Microsoft Corp.',           weight: 6.20 },
      { symbol: 'AMZN',  name: 'Amazon.com Inc.',           weight: 3.90 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. (A)',         weight: 2.50 },
      { symbol: 'META',  name: 'Meta Platforms Inc.',       weight: 2.50 },
      { symbol: 'GOOG',  name: 'Alphabet Inc. (C)',         weight: 2.30 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',                weight: 1.90 },
      { symbol: 'AVGO',  name: 'Broadcom Inc.',             weight: 1.80 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway B',     weight: 1.70 },
      { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',      weight: 1.60 },
      { symbol: 'LLY',   name: 'Eli Lilly and Co.',         weight: 1.40 },
      { symbol: 'UNH',   name: 'UnitedHealth Group Inc.',   weight: 1.30 },
      { symbol: 'V',     name: 'Visa Inc.',                 weight: 1.20 },
      { symbol: 'XOM',   name: 'Exxon Mobil Corp.',         weight: 1.10 },
    ],
    sectors: [
      { sector: 'Technology',             weight: 31.2 },
      { sector: 'Financial Services',     weight: 13.1 },
      { sector: 'Healthcare',             weight: 11.8 },
      { sector: 'Consumer Cyclical',      weight: 10.4 },
      { sector: 'Communication Services', weight: 8.9  },
      { sector: 'Industrials',            weight: 8.2  },
      { sector: 'Consumer Defensive',     weight: 5.9  },
      { sector: 'Energy',                 weight: 3.8  },
      { sector: 'Utilities',              weight: 2.5  },
      { sector: 'Real Estate',            weight: 2.2  },
      { sector: 'Basic Materials',        weight: 2.0  },
    ],
  },
  QQQ: {
    holdings: [
      { symbol: 'MSFT',  name: 'Microsoft Corp.',           weight: 8.70 },
      { symbol: 'AAPL',  name: 'Apple Inc.',                weight: 8.50 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp.',              weight: 8.20 },
      { symbol: 'AMZN',  name: 'Amazon.com Inc.',           weight: 5.40 },
      { symbol: 'META',  name: 'Meta Platforms Inc.',       weight: 4.90 },
      { symbol: 'AVGO',  name: 'Broadcom Inc.',             weight: 4.60 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',                weight: 3.90 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. (A)',         weight: 3.50 },
      { symbol: 'GOOG',  name: 'Alphabet Inc. (C)',         weight: 3.20 },
      { symbol: 'COST',  name: 'Costco Wholesale Corp.',    weight: 2.60 },
      { symbol: 'NFLX',  name: 'Netflix Inc.',              weight: 2.10 },
      { symbol: 'AMD',   name: 'Advanced Micro Devices',    weight: 1.80 },
      { symbol: 'ADBE',  name: 'Adobe Inc.',                weight: 1.60 },
      { symbol: 'PEP',   name: 'PepsiCo Inc.',              weight: 1.50 },
      { symbol: 'LIN',   name: 'Linde PLC',                 weight: 1.30 },
    ],
    sectors: [
      { sector: 'Technology',             weight: 50.9 },
      { sector: 'Communication Services', weight: 15.8 },
      { sector: 'Consumer Cyclical',      weight: 14.7 },
      { sector: 'Healthcare',             weight: 6.4  },
      { sector: 'Industrials',            weight: 4.8  },
      { sector: 'Consumer Defensive',     weight: 4.2  },
      { sector: 'Financial Services',     weight: 2.1  },
      { sector: 'Basic Materials',        weight: 1.1  },
    ],
  },
  DIA: {
    holdings: [
      { symbol: 'GS',   name: 'Goldman Sachs Group Inc.',  weight: 8.20 },
      { symbol: 'UNH',  name: 'UnitedHealth Group Inc.',   weight: 7.80 },
      { symbol: 'MSFT', name: 'Microsoft Corp.',           weight: 5.90 },
      { symbol: 'HD',   name: 'Home Depot Inc.',           weight: 5.50 },
      { symbol: 'CAT',  name: 'Caterpillar Inc.',          weight: 5.10 },
      { symbol: 'SHW',  name: 'Sherwin-Williams Co.',      weight: 4.90 },
      { symbol: 'AMGN', name: 'Amgen Inc.',                weight: 4.80 },
      { symbol: 'AXP',  name: 'American Express Co.',      weight: 4.70 },
      { symbol: 'MCD',  name: 'McDonald\'s Corp.',         weight: 4.20 },
      { symbol: 'V',    name: 'Visa Inc.',                 weight: 3.90 },
      { symbol: 'TRV',  name: 'Travelers Companies Inc.',  weight: 3.60 },
      { symbol: 'JPM',  name: 'JPMorgan Chase & Co.',      weight: 3.50 },
      { symbol: 'IBM',  name: 'IBM Corp.',                 weight: 3.30 },
      { symbol: 'HON',  name: 'Honeywell International',   weight: 3.10 },
      { symbol: 'AAPL', name: 'Apple Inc.',                weight: 3.00 },
    ],
    sectors: [
      { sector: 'Financial Services',     weight: 21.4 },
      { sector: 'Industrials',            weight: 19.8 },
      { sector: 'Technology',             weight: 17.6 },
      { sector: 'Healthcare',             weight: 15.2 },
      { sector: 'Consumer Cyclical',      weight: 14.1 },
      { sector: 'Consumer Defensive',     weight: 6.3  },
      { sector: 'Energy',                 weight: 3.1  },
      { sector: 'Basic Materials',        weight: 2.5  },
    ],
  },
  IWM: {
    holdings: [
      { symbol: 'SAIA',  name: 'SAIA Inc.',                weight: 0.50 },
      { symbol: 'CAVA',  name: 'CAVA Group Inc.',          weight: 0.47 },
      { symbol: 'FTAI',  name: 'FTAI Aviation Ltd.',       weight: 0.45 },
      { symbol: 'VKTX',  name: 'Viking Therapeutics Inc.', weight: 0.43 },
      { symbol: 'CHRD',  name: 'Chord Energy Corp.',       weight: 0.41 },
      { symbol: 'RDNT',  name: 'RadNet Inc.',              weight: 0.40 },
      { symbol: 'PLMR',  name: 'Palomar Holdings Inc.',    weight: 0.38 },
      { symbol: 'BPMC',  name: 'Blueprint Medicines',      weight: 0.37 },
      { symbol: 'CORT',  name: 'Corcept Therapeutics',     weight: 0.36 },
      { symbol: 'ACLX',  name: 'Arcellx Inc.',             weight: 0.35 },
    ],
    sectors: [
      { sector: 'Financial Services',     weight: 19.6 },
      { sector: 'Industrials',            weight: 18.1 },
      { sector: 'Healthcare',             weight: 14.8 },
      { sector: 'Technology',             weight: 13.2 },
      { sector: 'Consumer Cyclical',      weight: 10.9 },
      { sector: 'Energy',                 weight: 6.4  },
      { sector: 'Real Estate',            weight: 6.1  },
      { sector: 'Consumer Defensive',     weight: 4.2  },
      { sector: 'Basic Materials',        weight: 3.8  },
      { sector: 'Utilities',              weight: 2.9  },
    ],
  },
  VTI: {
    holdings: [
      { symbol: 'AAPL',  name: 'Apple Inc.',               weight: 6.10 },
      { symbol: 'NVDA',  name: 'NVIDIA Corp.',              weight: 5.80 },
      { symbol: 'MSFT',  name: 'Microsoft Corp.',           weight: 5.50 },
      { symbol: 'AMZN',  name: 'Amazon.com Inc.',           weight: 3.50 },
      { symbol: 'GOOGL', name: 'Alphabet Inc. (A)',         weight: 2.20 },
      { symbol: 'META',  name: 'Meta Platforms Inc.',       weight: 2.10 },
      { symbol: 'TSLA',  name: 'Tesla Inc.',                weight: 1.80 },
      { symbol: 'AVGO',  name: 'Broadcom Inc.',             weight: 1.60 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway B',     weight: 1.50 },
      { symbol: 'JPM',   name: 'JPMorgan Chase & Co.',      weight: 1.40 },
    ],
    sectors: [
      { sector: 'Technology',             weight: 29.4 },
      { sector: 'Financial Services',     weight: 13.8 },
      { sector: 'Healthcare',             weight: 12.1 },
      { sector: 'Consumer Cyclical',      weight: 9.8  },
      { sector: 'Industrials',            weight: 9.2  },
      { sector: 'Communication Services', weight: 8.1  },
      { sector: 'Consumer Defensive',     weight: 6.1  },
      { sector: 'Energy',                 weight: 3.6  },
      { sector: 'Real Estate',            weight: 3.2  },
      { sector: 'Utilities',              weight: 2.5  },
      { sector: 'Basic Materials',        weight: 2.2  },
    ],
  },
  TLT: {
    holdings: [
      { symbol: 'T 4.75 11/15/43', name: 'US Treasury 4.750% Nov 2043', weight: 4.80 },
      { symbol: 'T 4.50 02/15/44', name: 'US Treasury 4.500% Feb 2044', weight: 4.60 },
      { symbol: 'T 4.25 05/15/44', name: 'US Treasury 4.250% May 2044', weight: 4.40 },
      { symbol: 'T 3.875 08/15/40',name: 'US Treasury 3.875% Aug 2040', weight: 3.90 },
      { symbol: 'T 3.00 11/15/44', name: 'US Treasury 3.000% Nov 2044', weight: 3.70 },
      { symbol: 'T 3.625 08/15/43',name: 'US Treasury 3.625% Aug 2043', weight: 3.50 },
      { symbol: 'T 2.875 05/15/52',name: 'US Treasury 2.875% May 2052', weight: 3.30 },
      { symbol: 'T 2.25 08/15/46', name: 'US Treasury 2.250% Aug 2046', weight: 3.10 },
      { symbol: 'T 1.875 02/15/51',name: 'US Treasury 1.875% Feb 2051', weight: 2.90 },
      { symbol: 'T 2.375 11/15/49',name: 'US Treasury 2.375% Nov 2049', weight: 2.70 },
    ],
    sectors: [
      { sector: 'US Government Bonds (20+ yr)', weight: 100.0 },
    ],
  },
  GLD: {
    holdings: [
      { symbol: 'GOLD', name: 'Physical Gold (LBMA)', weight: 99.80 },
      { symbol: 'CASH', name: 'Cash & Cash Equivalents', weight: 0.20 },
    ],
    sectors: [
      { sector: 'Precious Metals', weight: 99.8 },
      { sector: 'Cash',            weight: 0.2  },
    ],
  },
  ARKK: {
    holdings: [
      { symbol: 'TSLA',  name: 'Tesla Inc.',               weight: 13.50 },
      { symbol: 'RBLX',  name: 'Roblox Corp.',             weight: 8.20  },
      { symbol: 'ROKU',  name: 'Roku Inc.',                weight: 7.40  },
      { symbol: 'COIN',  name: 'Coinbase Global Inc.',     weight: 7.10  },
      { symbol: 'PATH',  name: 'UiPath Inc.',              weight: 6.30  },
      { symbol: 'EXAS',  name: 'Exact Sciences Corp.',     weight: 5.90  },
      { symbol: 'IOVA',  name: 'Iovance Biotherapeutics', weight: 5.40  },
      { symbol: 'TWLO',  name: 'Twilio Inc.',             weight: 4.80  },
      { symbol: 'DNA',   name: 'Ginkgo Bioworks',         weight: 4.30  },
      { symbol: 'BEAM',  name: 'Beam Therapeutics Inc.',  weight: 4.10  },
    ],
    sectors: [
      { sector: 'Technology',         weight: 48.2 },
      { sector: 'Healthcare',         weight: 28.4 },
      { sector: 'Consumer Cyclical',  weight: 14.5 },
      { sector: 'Financial Services', weight: 8.9  },
    ],
  },
  VNQ: {
    holdings: [
      { symbol: 'VNQ',   name: 'Vanguard Real Estate ETF (self)',   weight: 12.10 },
      { symbol: 'AMT',   name: 'American Tower Corp.',              weight: 6.80  },
      { symbol: 'PLD',   name: 'Prologis Inc.',                     weight: 6.50  },
      { symbol: 'EQIX',  name: 'Equinix Inc.',                      weight: 5.90  },
      { symbol: 'WELL',  name: 'Welltower Inc.',                    weight: 4.70  },
      { symbol: 'DLR',   name: 'Digital Realty Trust Inc.',         weight: 4.30  },
      { symbol: 'SPG',   name: 'Simon Property Group Inc.',         weight: 4.00  },
      { symbol: 'O',     name: 'Realty Income Corp.',               weight: 3.80  },
      { symbol: 'PSA',   name: 'Public Storage',                    weight: 3.50  },
      { symbol: 'EXR',   name: 'Extra Space Storage Inc.',          weight: 3.10  },
    ],
    sectors: [
      { sector: 'Real Estate',            weight: 88.2 },
      { sector: 'Technology',             weight: 8.4  },
      { sector: 'Financial Services',     weight: 3.4  },
    ],
  },
}

const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  const sym  = symbol.toUpperCase()
  const data = ETF_STATIC[sym] ?? { holdings: [], sectors: [] }
  return NextResponse.json(data, { headers: EDGE_HEADERS })
}
