/**
 * lib/api/central-banks.ts
 * ─────────────────────────
 * Central bank policy rates — multi-source, best-effort:
 *
 *  Fed  → FRED DFF        (daily, very current)
 *  ECB  → FRED ECBDFR     (daily, very current)
 *  BoE  → Bank of England stats CSV API  (daily)
 *  BoC  → Bank of Canada Valet API       (daily)
 *  rest → FRED monthly series, skipped if data is > MAX_STALE_DAYS old
 */

import { cachedFetch }           from '@/lib/cache/redis'
import { getSeriesObservations } from '@/lib/api/fred'
import type { FredObservation }  from '@/lib/api/fred'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CentralBankRate {
  id:           string
  bank:         string
  country:      string
  flag:         string
  currency:     string
  rate:         number
  previousRate: number | null
  change:       number | null  // basis points
  direction:    'hike' | 'cut' | 'hold'
  lastUpdated:  string         // "YYYY-MM-DD"
}

// ─── Bank configuration ───────────────────────────────────────────────────

type Source = 'fred' | 'boe' | 'boc'

interface BankConfig {
  id:           string
  bank:         string
  country:      string
  flag:         string
  currency:     string
  source:       Source
  fredSeries?:  string   // for source: 'fred'
  maxStaleDays: number   // skip card if FRED data is older than this
}

const BANK_CONFIGS: BankConfig[] = [
  { id: 'fed',  bank: 'Federal Reserve',           country: 'US', flag: '🇺🇸', currency: 'USD', source: 'fred', fredSeries: 'DFF',             maxStaleDays: 10  },
  { id: 'ecb',  bank: 'ECB',                       country: 'EU', flag: '🇪🇺', currency: 'EUR', source: 'fred', fredSeries: 'ECBDFR',           maxStaleDays: 10  },
  { id: 'boe',  bank: 'Bank of England',           country: 'UK', flag: '🇬🇧', currency: 'GBP', source: 'boe',                                  maxStaleDays: 10  },
  { id: 'boj',  bank: 'Bank of Japan',             country: 'JP', flag: '🇯🇵', currency: 'JPY', source: 'fred', fredSeries: 'IRSTCB01JPM156N',  maxStaleDays: 180 },
  { id: 'pboc', bank: "People's Bank of China",    country: 'CN', flag: '🇨🇳', currency: 'CNY', source: 'fred', fredSeries: 'INTDSRCNM193N',    maxStaleDays: 365 },
  { id: 'rba',  bank: 'Reserve Bank of Australia', country: 'AU', flag: '🇦🇺', currency: 'AUD', source: 'fred', fredSeries: 'IRSTCB01AUM156N',  maxStaleDays: 180 },
  { id: 'snb',  bank: 'Swiss National Bank',       country: 'CH', flag: '🇨🇭', currency: 'CHF', source: 'fred', fredSeries: 'IRSTCB01CHM156N',  maxStaleDays: 180 },
  { id: 'boc',  bank: 'Bank of Canada',            country: 'CA', flag: '🇨🇦', currency: 'CAD', source: 'boc',                                  maxStaleDays: 10  },
  { id: 'rbi',  bank: 'Reserve Bank of India',     country: 'IN', flag: '🇮🇳', currency: 'INR', source: 'fred', fredSeries: 'IRSTCB01INM156N',  maxStaleDays: 180 },
  { id: 'bcb',  bank: 'Central Bank of Brazil',    country: 'BR', flag: '🇧🇷', currency: 'BRL', source: 'fred', fredSeries: 'IRSTCB01BRM156N',  maxStaleDays: 180 },
]

// ─── Staleness helper ─────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime()
  return ms / 86_400_000
}

// ─── Direction helper ─────────────────────────────────────────────────────

function toDirection(change: number | null): CentralBankRate['direction'] {
  if (change == null) return 'hold'
  if (change > 0)    return 'hike'
  if (change < 0)    return 'cut'
  return 'hold'
}

// ─── FRED source ──────────────────────────────────────────────────────────

async function fromFred(cfg: BankConfig): Promise<CentralBankRate | null> {
  if (!cfg.fredSeries) return null

  let obs: FredObservation[]
  try {
    obs = await getSeriesObservations(cfg.fredSeries, 2)
  } catch (err) {
    console.warn('[central-banks] fetchBankRate failed:', (err as Error).message)
    return null
  }
  if (!obs.length) return null

  const latest   = obs[0]
  const previous = obs[1]

  if (!latest || latest.value === '.') return null
  if (daysSince(latest.date) > cfg.maxStaleDays) return null

  const rate     = Number(latest.value)
  const prevRate = previous?.value && previous.value !== '.' ? Number(previous.value) : null
  const changeBp = prevRate != null ? Math.round((rate - prevRate) * 100) : null

  return {
    id:           cfg.id,
    bank:         cfg.bank,
    country:      cfg.country,
    flag:         cfg.flag,
    currency:     cfg.currency,
    rate,
    previousRate: prevRate,
    change:       changeBp,
    direction:    toDirection(changeBp),
    lastUpdated:  latest.date,
  }
}

// ─── Bank of England source ───────────────────────────────────────────────
// Series IUDBEDR = Official Bank Rate, returns CSV with header rows

// Month abbreviation → zero-padded month number
const BOE_MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function parseBoeDate(dateStr: string): string {
  // Input: "16 Mar 2026"  →  Output: "2026-03-16"
  const [day, mon, year] = dateStr.trim().split(/\s+/)
  return `${year}-${BOE_MONTHS[mon] ?? '01'}-${day.padStart(2, '0')}`
}

async function fromBoE(cfg: BankConfig): Promise<CentralBankRate | null> {
  const CACHE_KEY = 'boe:bank-rate:v2'  // bumped: fix date parsing
  const CACHE_TTL = 6 * 60 * 60

  return cachedFetch<CentralBankRate | null>(CACHE_KEY, CACHE_TTL, async () => {
    const url = 'https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp'
      + '?csv.x=yes&Datefrom=01/Jan/2024&Dateto=now&SeriesCodes=IUDBEDR&CSVF=TT&UsingCodes=Y'

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return null

    const text = await res.text()
    // CSV format: header rows, then "DD Mon YYYY,rate" per data row
    const rows = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^\d{2}\s+\w+\s+\d{4},/.test(l))

    if (!rows.length) return null

    const parseRow = (row: string) => {
      const comma = row.indexOf(',')
      return {
        date:  parseBoeDate(row.slice(0, comma)),
        value: parseFloat(row.slice(comma + 1).trim()),
      }
    }

    const latest = parseRow(rows[rows.length - 1])
    if (isNaN(latest.value)) return null

    // Find the most recent row with a different rate
    let prevRate: number | null = null
    for (let i = rows.length - 2; i >= 0; i--) {
      const p = parseRow(rows[i])
      if (!isNaN(p.value) && p.value !== latest.value) { prevRate = p.value; break }
    }

    const changeBp = prevRate != null ? Math.round((latest.value - prevRate) * 100) : null

    return {
      id:           cfg.id,
      bank:         cfg.bank,
      country:      cfg.country,
      flag:         cfg.flag,
      currency:     cfg.currency,
      rate:         latest.value,
      previousRate: prevRate,
      change:       changeBp,
      direction:    toDirection(changeBp),
      lastUpdated:  latest.date,
    }
  })
}

// ─── Bank of Canada Valet source ──────────────────────────────────────────
// Series V39079 = Target for the Overnight Rate

async function fromBoC(cfg: BankConfig): Promise<CentralBankRate | null> {
  const CACHE_KEY = 'boc:overnight-rate:v1'
  const CACHE_TTL = 6 * 60 * 60

  return cachedFetch<CentralBankRate | null>(CACHE_KEY, CACHE_TTL, async () => {
    const res = await fetch(
      'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10',
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return null

    const json = await res.json()
    const obs: Array<{ d: string; V39079: { v: string } }> = json?.observations ?? []
    if (!obs.length) return null

    const latest = obs[obs.length - 1]
    const rate   = parseFloat(latest.V39079.v)
    if (isNaN(rate)) return null

    // Find previous distinct rate
    let prevRate: number | null = null
    for (let i = obs.length - 2; i >= 0; i--) {
      const p = parseFloat(obs[i].V39079.v)
      if (p !== rate) { prevRate = p; break }
    }

    const changeBp = prevRate != null ? Math.round((rate - prevRate) * 100) : null

    return {
      id:           cfg.id,
      bank:         cfg.bank,
      country:      cfg.country,
      flag:         cfg.flag,
      currency:     cfg.currency,
      rate,
      previousRate: prevRate,
      change:       changeBp,
      direction:    toDirection(changeBp),
      lastUpdated:  latest.d,
    }
  })
}

// ─── Dispatcher ───────────────────────────────────────────────────────────

async function fetchBankRate(cfg: BankConfig): Promise<CentralBankRate | null> {
  try {
    switch (cfg.source) {
      case 'boe':  return await fromBoE(cfg)
      case 'boc':  return await fromBoC(cfg)
      default:     return await fromFred(cfg)
    }
  } catch (err) {
    console.warn(`[central-banks] fetchBankRate(${cfg.bank}) failed:`, (err as Error).message)
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getCentralBankRates(): Promise<CentralBankRate[]> {
  const results = await Promise.allSettled(BANK_CONFIGS.map(fetchBankRate))
  return results
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter((r): r is CentralBankRate => r !== null)
    // Sort: highest rate first
    .sort((a, b) => b.rate - a.rate)
}
