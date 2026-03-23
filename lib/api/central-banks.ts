/**
 * lib/api/central-banks.ts
 * ─────────────────────────
 * Central bank policy rates via API Ninjas (primary, updates every ~4h)
 * Historical endpoint used to compute hike/cut/hold direction + bps change
 */

import { cachedFetch } from '@/lib/cache/redis'

// ─── Types ────────────────────────────────────────────────────────────────

export interface CentralBankRate {
  id:           string
  bank:         string
  country:      string
  flag:         string
  currency:     string
  rate:         number
  previousRate: number | null
  change:       number | null  // basis points: Math.round((rate - previousRate) * 100)
  direction:    'hike' | 'cut' | 'hold'
  lastUpdated:  string         // "YYYY-MM-DD"
}

// ─── Bank configuration ───────────────────────────────────────────────────

interface BankConfig {
  id:        string
  bank:      string
  country:   string
  flag:      string
  currency:  string
  ninjaRate: string  // API Ninjas rate parameter
}

const BANK_CONFIGS: BankConfig[] = [
  { id: 'fed',  bank: 'Federal Reserve',           country: 'US', flag: '🇺🇸', currency: 'USD', ninjaRate: 'central_bank_us' },
  { id: 'ecb',  bank: 'ECB',                       country: 'EU', flag: '🇪🇺', currency: 'EUR', ninjaRate: 'central_bank_eu' },
  { id: 'boe',  bank: 'Bank of England',           country: 'UK', flag: '🇬🇧', currency: 'GBP', ninjaRate: 'central_bank_uk' },
  { id: 'boj',  bank: 'Bank of Japan',             country: 'JP', flag: '🇯🇵', currency: 'JPY', ninjaRate: 'central_bank_jp' },
  { id: 'pboc', bank: "People's Bank of China",    country: 'CN', flag: '🇨🇳', currency: 'CNY', ninjaRate: 'central_bank_cn' },
  { id: 'rba',  bank: 'Reserve Bank of Australia', country: 'AU', flag: '🇦🇺', currency: 'AUD', ninjaRate: 'central_bank_au' },
  { id: 'snb',  bank: 'Swiss National Bank',       country: 'CH', flag: '🇨🇭', currency: 'CHF', ninjaRate: 'central_bank_ch' },
  { id: 'boc',  bank: 'Bank of Canada',            country: 'CA', flag: '🇨🇦', currency: 'CAD', ninjaRate: 'central_bank_ca' },
  { id: 'rbi',  bank: 'Reserve Bank of India',     country: 'IN', flag: '🇮🇳', currency: 'INR', ninjaRate: 'central_bank_in' },
  { id: 'bcb',  bank: 'Central Bank of Brazil',    country: 'BR', flag: '🇧🇷', currency: 'BRL', ninjaRate: 'central_bank_br' },
]

// ─── API Ninjas fetch ─────────────────────────────────────────────────────

interface NinjasResult {
  rate:        number
  updated:     string
  previousRate?: number
}

async function fetchFromNinjas(rateName: string): Promise<NinjasResult | null> {
  const apiKey = process.env.API_NINJAS_KEY
  if (!apiKey) return null

  try {
    // Fetch current rate
    const res = await fetch(
      `https://api.api-ninjas.com/v2/interestrate?rate=${rateName}`,
      { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(8_000) },
    )
    if (!res.ok) return null

    const data = await res.json()
    // Response: { name, rate_pct, updated } or array of the same
    const item = Array.isArray(data) ? data[0] : data
    if (!item || item.rate_pct == null) return null

    const rate    = item.rate_pct as number
    const updated = (item.updated as string | undefined) ?? new Date().toISOString().slice(0, 10)

    // Fetch historical data to determine the previous rate for direction/bps
    let previousRate: number | undefined
    try {
      const now            = Math.floor(Date.now() / 1_000)
      const threeMonthsAgo = now - 90 * 24 * 60 * 60
      const histRes = await fetch(
        `https://api.api-ninjas.com/v2/interestrate/historical?rate=${rateName}&start_time=${threeMonthsAgo}&end_time=${now}`,
        { headers: { 'X-Api-Key': apiKey }, signal: AbortSignal.timeout(8_000) },
      )
      if (histRes.ok) {
        const histData = await histRes.json()
        const points = (histData?.data ?? histData) as Array<{ rate_pct: number }>
        if (Array.isArray(points) && points.length >= 2) {
          // Points are in ascending chronological order; find the most recent rate
          // different from current to identify the last change
          const rateValues = points.map(p => p.rate_pct)
          for (let i = rateValues.length - 1; i >= 0; i--) {
            if (rateValues[i] !== rate) {
              previousRate = rateValues[i]
              break
            }
          }
        }
      }
    } catch {
      // Historical is optional — direction defaults to 'hold' when unavailable
    }

    return { rate, updated, previousRate }
  } catch (err) {
    console.warn(`[central-banks] API Ninjas failed for ${rateName}:`, err)
    return null
  }
}

// ─── Fetch single bank ─────────────────────────────────────────────────────

async function fetchBankRate(config: BankConfig): Promise<CentralBankRate | null> {
  return cachedFetch<CentralBankRate | null>(
    `ninjas:central-bank:${config.id}:v1`,
    6 * 60 * 60,
    async () => {
      const result = await fetchFromNinjas(config.ninjaRate)
      if (!result) return null

      const changeBp = result.previousRate != null
        ? Math.round((result.rate - result.previousRate) * 100)
        : null

      const direction: CentralBankRate['direction'] =
        changeBp == null ? 'hold' :
        changeBp > 0     ? 'hike' :
        changeBp < 0     ? 'cut'  : 'hold'

      // Convert "MM-DD-YYYY" → "YYYY-MM-DD" for consistent ISO display
      let lastUpdated = result.updated
      const match = result.updated.match(/^(\d{2})-(\d{2})-(\d{4})$/)
      if (match) lastUpdated = `${match[3]}-${match[1]}-${match[2]}`

      return {
        id:           config.id,
        bank:         config.bank,
        country:      config.country,
        flag:         config.flag,
        currency:     config.currency,
        rate:         result.rate,
        previousRate: result.previousRate ?? null,
        change:       changeBp,
        direction,
        lastUpdated,
      }
    },
  )
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getCentralBankRates(): Promise<CentralBankRate[]> {
  const results = await Promise.allSettled(BANK_CONFIGS.map(fetchBankRate))

  const rates = results
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter((r): r is CentralBankRate => r !== null)

  // Highest policy rate first
  rates.sort((a, b) => b.rate - a.rate)

  return rates
}
