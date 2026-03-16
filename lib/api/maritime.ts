/**
 * lib/api/maritime.ts
 * ───────────────────
 * Maritime traffic data from static JSON file
 * Returns ships + chokepoint summary counts
 */

import { readFileSync } from 'fs'
import { join }         from 'path'

// ─── Types ────────────────────────────────────────────────────────────────

export interface Ship {
  id:         string
  name:       string
  type:       string
  category:   'tanker' | 'lng' | 'cargo' | 'military'
  flag:       string
  lat:        number
  lng:        number
  heading:    number
  speed:      number
  destination:string
  cargo:      string
  chokepoint: 'hormuz' | 'suez' | 'malacca' | 'babelMandeb'
  status:     'TRANSITING' | 'REROUTED' | 'ANCHORED' | 'DELAYED'
}

export interface ChokepointSummary {
  hormuz:      number
  suez:        number
  malacca:     number
  babelMandeb: number
}

export interface MaritimeData {
  ships:       Ship[]
  chokepoints: ChokepointSummary
}

// ─── Load static data ──────────────────────────────────────────────────────

function loadShips(): Ship[] {
  try {
    const filePath = join(process.cwd(), 'public', 'data', 'maritime-traffic.json')
    const raw      = readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Ship[]
  } catch (err) {
    console.error('[maritime] Failed to load maritime-traffic.json:', err)
    return []
  }
}

// ─── Build chokepoint summary ──────────────────────────────────────────────

function buildSummary(ships: Ship[]): ChokepointSummary {
  return {
    hormuz:      ships.filter((s) => s.chokepoint === 'hormuz').length,
    suez:        ships.filter((s) => s.chokepoint === 'suez').length,
    malacca:     ships.filter((s) => s.chokepoint === 'malacca').length,
    babelMandeb: ships.filter((s) => s.chokepoint === 'babelMandeb').length,
  }
}

// ─── Main exported function ────────────────────────────────────────────────

export function getMaritimeTraffic(): MaritimeData {
  const ships = loadShips()
  return {
    ships,
    chokepoints: buildSummary(ships),
  }
}
