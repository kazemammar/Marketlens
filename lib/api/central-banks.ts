/**
 * lib/api/central-banks.ts
 * ─────────────────────────
 * Central bank policy rates via FRED API
 * Uses getSeriesObservations to fetch latest 2 readings (current + previous)
 */

import { getSeriesObservations } from '@/lib/api/fred'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CentralBankRate {
  id:        string
  name:      string      // 'Fed', 'ECB', etc.
  fullName:  string
  flag:      string      // emoji flag
  country:   string
  rate:      number | null
  previous:  number | null
  change:    number | null  // rate - previous
  bps:       number | null  // change * 100, rounded
  direction: 'HIKE' | 'CUT' | 'HOLD' | null
  date:      string | null
}

// ─── Bank configuration ───────────────────────────────────────────────────

interface BankConfig {
  id:       string
  seriesId: string
  name:     string
  fullName: string
  flag:     string
  country:  string
}

const BANK_CONFIGS: BankConfig[] = [
  { id: 'fed',  seriesId: 'FEDFUNDS',        name: 'Fed',  flag: '🇺🇸', fullName: 'Federal Reserve',          country: 'United States'  },
  { id: 'ecb',  seriesId: 'ECBDFR',          name: 'ECB',  flag: '🇪🇺', fullName: 'European Central Bank',     country: 'Eurozone'       },
  { id: 'boe',  seriesId: 'BOERUKQ',         name: 'BoE',  flag: '🇬🇧', fullName: 'Bank of England',           country: 'United Kingdom' },
  { id: 'boj',  seriesId: 'IRSTCB01JPM156N', name: 'BoJ',  flag: '🇯🇵', fullName: 'Bank of Japan',             country: 'Japan'          },
  { id: 'pboc', seriesId: 'INTDSRCNM193N',   name: 'PBoC', flag: '🇨🇳', fullName: "People's Bank of China",    country: 'China'          },
  { id: 'rba',  seriesId: 'IRSTCB01AUM156N', name: 'RBA',  flag: '🇦🇺', fullName: 'Reserve Bank of Australia', country: 'Australia'      },
  { id: 'snb',  seriesId: 'IRSTCB01CHM156N', name: 'SNB',  flag: '🇨🇭', fullName: 'Swiss National Bank',       country: 'Switzerland'    },
  { id: 'boc',  seriesId: 'IRSTCB01CAM156N', name: 'BoC',  flag: '🇨🇦', fullName: 'Bank of Canada',            country: 'Canada'         },
  { id: 'rbi',  seriesId: 'IRSTCB01INM156N', name: 'RBI',  flag: '🇮🇳', fullName: 'Reserve Bank of India',     country: 'India'          },
  { id: 'bcb',  seriesId: 'IRSTCB01BRM156N', name: 'BCB',  flag: '🇧🇷', fullName: 'Banco Central do Brasil',   country: 'Brazil'         },
]

// ─── Empty rate helper ─────────────────────────────────────────────────────

function emptyRate(cfg: BankConfig): CentralBankRate {
  return {
    id:        cfg.id,
    name:      cfg.name,
    fullName:  cfg.fullName,
    flag:      cfg.flag,
    country:   cfg.country,
    rate:      null,
    previous:  null,
    change:    null,
    bps:       null,
    direction: null,
    date:      null,
  }
}

// ─── Fetch single bank ─────────────────────────────────────────────────────

async function fetchBankRate(cfg: BankConfig): Promise<CentralBankRate> {
  try {
    const obs = await getSeriesObservations(cfg.seriesId, 2)
    if (!obs.length) return emptyRate(cfg)

    // FRED uses '.' for missing values
    const latestRaw   = obs[0]?.value
    const previousRaw = obs[1]?.value

    const rate     = !latestRaw   || latestRaw   === '.' ? null : Number(latestRaw)
    const previous = !previousRaw || previousRaw === '.' ? null : Number(previousRaw)

    if (rate == null) return emptyRate(cfg)

    const change = previous != null ? rate - previous : null
    const bps    = change != null ? Math.round(change * 100) : null

    let direction: CentralBankRate['direction'] = null
    if (change != null) {
      if (change > 0.001)       direction = 'HIKE'
      else if (change < -0.001) direction = 'CUT'
      else                      direction = 'HOLD'
    }

    return {
      ...emptyRate(cfg),
      rate,
      previous,
      change,
      bps,
      direction,
      date: obs[0]?.date ?? null,
    }
  } catch {
    return emptyRate(cfg)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getAllCentralBankRates(): Promise<CentralBankRate[]> {
  const results = await Promise.allSettled(BANK_CONFIGS.map(fetchBankRate))
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : emptyRate(BANK_CONFIGS[i]),
  )
}
