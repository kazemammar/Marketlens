'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChokepointStatus, ChokepointIntelPayload } from '@/lib/api/chokepoints'
import type { Earthquake } from '@/lib/api/usgs'
import type { NewsHeatPoint } from '@/app/api/news-heat/route'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Draggable hook ──────────────────────────────────────────────────────
function useDraggable() {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    // Don't start drag on interactive elements
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'A') return
    dragging.current = true
    offset.current = {
      x: e.clientX - el.getBoundingClientRect().left,
      y: e.clientY - el.getBoundingClientRect().top,
    }
    el.setPointerCapture(e.pointerId)
    el.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !ref.current) return
    const parent = ref.current.parentElement
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    const newLeft = e.clientX - parentRect.left - offset.current.x
    const newTop = e.clientY - parentRect.top - offset.current.y
    // Clamp within parent
    const el = ref.current
    const maxLeft = parentRect.width - el.offsetWidth
    const maxTop = parentRect.height - el.offsetHeight
    el.style.left = `${Math.max(0, Math.min(maxLeft, newLeft))}px`
    el.style.top = `${Math.max(0, Math.min(maxTop, newTop))}px`
    // Clear any right/bottom/transform positioning
    el.style.right = 'auto'
    el.style.bottom = 'auto'
    el.style.transform = 'none'
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
    if (ref.current) ref.current.style.cursor = 'grab'
  }, [])

  return { ref, onPointerDown, onPointerMove, onPointerUp }
}

// ─── Static data ──────────────────────────────────────────────────────────

const CONFLICT_ZONES = [
  { id: 'ukraine',  name: 'Ukraine–Russia War',  lat: 48.3,  lng: 37.8,  severity: 3,
    status: 'Active', description: 'Ongoing conventional war. Major grain, gas, and steel supply disruption.',
    assets: ['WEAT', 'UNG', 'SLV'], risk: 'CRITICAL' },
  { id: 'gaza',     name: 'Gaza Conflict',        lat: 31.5,  lng: 34.45, severity: 3,
    status: 'Active', description: 'Conflict with regional escalation risk. Proximity to Israeli energy infrastructure.',
    assets: ['GLD', 'USO'], risk: 'HIGH' },
  { id: 'redsea',   name: 'Red Sea / Yemen',      lat: 15.5,  lng: 42.5,  severity: 2,
    status: 'Active', description: 'Houthi attacks forcing rerouting. 12% of global trade affected.',
    assets: ['USO', 'BNO', 'XOM'], risk: 'HIGH' },
  { id: 'syria',    name: 'Syria Transition',     lat: 35.0,  lng: 38.0,  severity: 1,
    status: 'Ongoing', description: 'Post-Assad reconstruction. Pipeline and refugee spillover risk.',
    assets: ['USO'], risk: 'MEDIUM' },
  { id: 'sudan',    name: 'Sudan Civil War',       lat: 15.5,  lng: 32.5,  severity: 2,
    status: 'Active', description: 'SAF vs RSF. Nile basin and gold production instability.',
    assets: ['GLD'], risk: 'HIGH' },
  { id: 'myanmar',  name: 'Myanmar Civil War',    lat: 19.7,  lng: 96.2,  severity: 1,
    status: 'Ongoing', description: 'Military vs resistance. Rare earth and gas exports disrupted.',
    assets: ['UNG'], risk: 'MEDIUM' },
  { id: 'haiti',    name: 'Haiti Crisis',          lat: 18.9,  lng: -72.3, severity: 1,
    status: 'Ongoing', description: 'Gang-controlled capital. Regional instability, aid disruption.',
    assets: [], risk: 'LOW' },
  { id: 'drcongo', name: 'DR Congo (M23)', lat: -1.5, lng: 29.2, severity: 2,
    status: 'Active', description: 'M23 rebel offensive. Controls cobalt and coltan mining regions critical for EV batteries and electronics.',
    assets: [], risk: 'HIGH' },
  { id: 'sahel', name: 'Sahel Insurgency', lat: 14.0, lng: 0.0, severity: 2,
    status: 'Active', description: 'Jihadist insurgency across Niger, Burkina Faso, Mali. Affects uranium mining (Niger supplies 5% of global uranium) and gold production.',
    assets: ['GLD', 'URA'], risk: 'HIGH' },
  { id: 'southchinasea', name: 'South China Sea', lat: 14.5, lng: 115.0, severity: 2,
    status: 'Tensions', description: 'Territorial disputes involving China, Philippines, Vietnam. Controls $5T in annual trade. Direct Taiwan contingency implications.',
    assets: [], risk: 'HIGH' },
  { id: 'kashmir', name: 'India-Pakistan (Kashmir)', lat: 34.0, lng: 75.0, severity: 1,
    status: 'Tensions', description: 'Nuclear-armed rivals. Escalation risk affects South Asian markets, rupee, and defense stocks.',
    assets: [], risk: 'MEDIUM' },
  { id: 'ethiopia', name: 'Ethiopia (Post-Tigray)', lat: 9.0, lng: 39.0, severity: 1,
    status: 'Fragile Peace', description: 'Post-Tigray ceasefire. Amhara insurgency ongoing. Affects Nile dam negotiations and Horn of Africa stability.',
    assets: [], risk: 'MEDIUM' },
  { id: 'taiwan', name: 'Taiwan Strait', lat: 24.0, lng: 120.0, severity: 2,
    status: 'Tensions', description: 'Chinese military exercises near Taiwan. TSMC produces 90% of advanced chips. Blockade scenario would crash global tech supply.',
    assets: [], risk: 'HIGH' },
  { id: 'libya', name: 'Libya (Divided)', lat: 31.0, lng: 16.0, severity: 1,
    status: 'Fragile', description: 'Split between east and west governments. Oil production swings on militia control. 1.2M bbl/day when stable.',
    assets: ['USO'], risk: 'MEDIUM' },
]

const CHOKEPOINTS = [
  { id: 'hormuz',      name: 'Strait of Hormuz',     lat: 26.6,  lng: 56.2,
    traffic: '~21M bbl/day', oilPct: '21%', lngPct: '17%',
    description: 'World\'s most critical oil chokepoint. Iranian closure threat would spike Brent above $120.',
    assets: ['USO', 'BNO', 'XOM', 'CVX'] },
  { id: 'suez',        name: 'Suez Canal',            lat: 30.0,  lng: 32.3,
    traffic: '~50 ships/day', oilPct: '9%', lngPct: '8%',
    description: 'Disruption adds 10–14 days via Cape of Good Hope route, raising freight costs 40%.',
    assets: ['USO', 'FRO'] },
  { id: 'malacca',     name: 'Strait of Malacca',     lat: 2.5,   lng: 101.8,
    traffic: '~80K vessels/yr', oilPct: '40%', lngPct: '—',
    description: '40% of global trade. Blockage would strangle Asia-Pacific energy supply.',
    assets: ['USO', 'UNG'] },
  { id: 'babelMandeb', name: 'Bab el-Mandeb',         lat: 12.6,  lng: 43.3,
    traffic: '~6.2M bbl/day', oilPct: '6%', lngPct: '3%',
    description: 'Houthi threats have already rerouted major shipping volumes away from Red Sea.',
    assets: ['USO', 'BNO'] },
  { id: 'bosphorus',   name: 'Turkish Straits',        lat: 41.0,  lng: 29.0,
    traffic: '~50K vessels/yr', oilPct: '3%', lngPct: '—',
    description: 'Sole Black Sea exit. Controls Russian and Kazakh oil and Ukrainian grain exports.',
    assets: ['WEAT', 'USO'] },
  { id: 'panama',      name: 'Panama Canal',           lat: 9.1,   lng: -79.7,
    traffic: '~14K vessels/yr', oilPct: '1%', lngPct: '11%',
    description: 'Drought-reduced capacity. US LNG exports to Asia-Pacific significantly impacted.',
    assets: ['UNG', 'WEAT'] },
  { id: 'capeofgood',  name: 'Cape of Good Hope',      lat: -34.3, lng: 18.5,
    traffic: '~20K vessels/yr', oilPct: '5%', lngPct: '—',
    description: 'Alternative route when Suez disrupted. Adds 14 days and 30–40% extra fuel costs.',
    assets: ['USO'] },
  { id: 'danish',      name: 'Danish Straits',         lat: 55.7,  lng: 11.0,
    traffic: '~40K vessels/yr', oilPct: '2%', lngPct: '—',
    description: 'Baltic Sea exit. Controls Russian Baltic oil exports and LNG routes to Europe.',
    assets: ['USO', 'UNG'] },
]

const MILITARY_BASES = [
  { id: 'bahrain',   name: 'US 5th Fleet, Bahrain',         lat: 26.2,  lng: 50.6,  country: 'USA',
    purpose: 'Gulf naval HQ — directly controls Hormuz security. Coordinates anti-Houthi operations.' },
  { id: 'udeid',     name: 'Al-Udeid Air Base, Qatar',       lat: 25.1,  lng: 51.3,  country: 'USA',
    purpose: 'Largest US air base in Middle East. CENTCOM forward HQ. 10,000+ US personnel.' },
  { id: 'lemonnier', name: 'Camp Lemonnier, Djibouti',       lat: 11.5,  lng: 43.1,  country: 'USA',
    purpose: 'Only permanent US base in Africa. Guards Bab el-Mandeb chokepoint directly.' },
  { id: 'incirlik',  name: 'Incirlik Air Base, Turkey',      lat: 37.0,  lng: 35.4,  country: 'USA/NATO',
    purpose: 'NATO strategic hub. Houses US tactical nuclear weapons. Key for Mideast operations.' },
  { id: 'ramstein',  name: 'Ramstein Air Base, Germany',     lat: 49.4,  lng: 7.6,   country: 'USA/NATO',
    purpose: 'Largest US air base outside CONUS. EUCOM HQ. Critical for European deterrence.' },
  { id: 'diegog',   name: 'Diego Garcia, BIOT',             lat: -7.3,  lng: 72.4,  country: 'USA/UK',
    purpose: 'Indian Ocean strategic hub. Supports Middle East operations, controls maritime routes.' },
  { id: 'yokosuka',  name: 'Yokosuka Naval Base, Japan',     lat: 35.3,  lng: 139.7, country: 'USA',
    purpose: 'US 7th Fleet HQ. Controls Western Pacific including Taiwan Strait approaches.' },
]

const PIPELINES = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Druzhba', color: '#3b82f6', status: 'active', capacity: '1.2M bbl/day' },
      geometry: { type: 'LineString' as const, coordinates: [[37.6,55.7],[32.0,53.5],[26.0,52.0],[20.5,52.0],[16.5,51.5],[13.4,52.4]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'BTC Pipeline', color: '#22c55e', status: 'active', capacity: '1.2M bbl/day' },
      geometry: { type: 'LineString' as const, coordinates: [[49.9,40.4],[46.5,41.5],[44.8,41.7],[42.0,40.5],[38.5,38.5],[36.1,36.8]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Trans-Arabian', color: '#f59e0b', status: 'inactive', capacity: '0.5M bbl/day' },
      geometry: { type: 'LineString' as const, coordinates: [[50.2,26.3],[46.5,28.0],[43.5,29.5],[39.0,31.0],[36.5,32.5],[35.0,33.1]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Keystone', color: '#ef4444', status: 'active', capacity: '0.6M bbl/day' },
      geometry: { type: 'LineString' as const, coordinates: [[-110.0,49.0],[-104.0,45.0],[-99.0,41.0],[-96.5,36.5],[-95.2,29.8]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Nord Stream', color: '#64748b', status: 'damaged', capacity: '0 (damaged)' },
      geometry: { type: 'LineString' as const, coordinates: [[28.9,59.9],[22.0,58.5],[17.0,57.0],[13.8,54.1]] },
    },
  ],
}

const UNDERSEA_CABLES = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Trans-Atlantic' },
      geometry: { type: 'LineString' as const, coordinates: [[-74.0,40.7],[-50.0,50.0],[-20.0,52.0],[0.0,51.5],[2.3,48.8]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Trans-Pacific' },
      geometry: { type: 'LineString' as const, coordinates: [[-122.4,37.8],[-160.0,30.0],[-180.0,20.0],[145.0,35.0],[139.7,35.7]] },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Indian Ocean' },
      geometry: { type: 'LineString' as const, coordinates: [[32.5,-1.3],[50.0,12.0],[72.8,18.9],[80.3,13.1],[103.8,1.3]] },
    },
  ],
}

const NUCLEAR_SITES = [
  { id: 'zaporizhzhia', name: 'Zaporizhzhia NPP', lat: 47.5, lng: 34.6, country: 'Ukraine', note: 'Largest NPP in Europe. Under Russian military control. Recurring safety alerts.' },
  { id: 'bushehr',      name: 'Bushehr NPP',       lat: 28.8, lng: 50.9, country: 'Iran',    note: 'Iranian civilian nuclear facility. Under IAEA monitoring with enrichment concerns.' },
  { id: 'yongbyon',     name: 'Yongbyon Complex',  lat: 39.8, lng: 125.8, country: 'N.Korea', note: 'North Korean plutonium/enrichment complex. Active weapons program.' },
  { id: 'natanz',   name: 'Natanz Enrichment Facility',    lat: 33.7,  lng: 51.7,  country: 'Iran',         note: 'Primary uranium enrichment site. Subject of IAEA inspections and reported sabotage. Enrichment level is key market trigger.' },
  { id: 'fordow',   name: 'Fordow Enrichment Facility',    lat: 34.9,  lng: 51.6,  country: 'Iran',         note: 'Underground enrichment facility near Qom. Hardened against airstrikes. 60% enrichment reported.' },
  { id: 'dimona',   name: 'Dimona Nuclear Research Center', lat: 31.0,  lng: 35.1,  country: 'Israel',       note: 'Undeclared nuclear weapons facility. Estimated 80-400 warheads. Never officially confirmed.' },
  { id: 'barakah',  name: 'Barakah Nuclear Power Plant',    lat: 23.95, lng: 52.2,  country: 'UAE',          note: 'First nuclear power plant in the Arab world. 4 reactors, 5.6GW capacity. Korean-built APR-1400 design.' },
  { id: 'hinkley',  name: 'Hinkley Point C',                lat: 51.2,  lng: -3.13, country: 'UK',           note: 'Under construction. Largest infrastructure project in Europe. EDF/CGN joint venture. Major cost overruns.' },
]

// ─── Sanctioned countries ────────────────────────────────────────────────

const SANCTIONED_COUNTRIES = [
  { id: 'russia',    name: 'Russia',       lat: 61.5,  lng: 105.3, regime: 'US/EU/UK',
    sectors: 'Energy, finance, technology, defense, luxury goods',
    impact: 'Oil price cap at $60/bbl. SWIFT disconnection. Rerouted oil to India/China.' },
  { id: 'iran',      name: 'Iran',         lat: 32.4,  lng: 53.7,  regime: 'US/EU',
    sectors: 'Oil exports, banking, nuclear technology, metals',
    impact: 'Oil exports reduced to ~1.5M bbl/day (from 3.8M). Significant shadow fleet operations.' },
  { id: 'northkorea', name: 'North Korea', lat: 40.3,  lng: 127.5, regime: 'US/EU/UN',
    sectors: 'All trade, weapons, luxury goods, financial services',
    impact: 'Near-total economic isolation. Coal and mineral exports sanctioned.' },
  { id: 'syria_s',   name: 'Syria',        lat: 34.8,  lng: 38.9,  regime: 'US/EU',
    sectors: 'Oil, government officials, military procurement',
    impact: 'Reconstruction blocked. Caesar Act sanctions on any entity aiding Assad regime.' },
  { id: 'venezuela', name: 'Venezuela',    lat: 6.4,   lng: -66.6, regime: 'US',
    sectors: 'Oil (PDVSA), gold, government officials',
    impact: 'Oil exports severely curtailed. Largest proven reserves globally (303B barrels) largely untapped.' },
  { id: 'myanmar_s', name: 'Myanmar',      lat: 19.7,  lng: 96.2,  regime: 'US/EU/UK',
    sectors: 'Military entities, gems, timber, metals',
    impact: 'Rare earth and natural gas exports disrupted. Key supplier of rare earths to China.' },
  { id: 'cuba',      name: 'Cuba',         lat: 21.5,  lng: -77.8, regime: 'US',
    sectors: 'Comprehensive trade embargo since 1962',
    impact: 'Longest-running trade embargo in history. Nickel and cobalt exports limited.' },
  { id: 'belarus',   name: 'Belarus',      lat: 53.7,  lng: 27.9,  regime: 'US/EU/UK',
    sectors: 'Potash, petroleum products, government officials',
    impact: 'Major potash producer (20% of global supply). Sanctions drove potash prices up 300% in 2022.' },
]

// ─── Shipping lanes (major global trade routes) ───────────────────────────

const SHIPPING_LANES = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Persian Gulf → Asia (via Hormuz & Malacca)', route: 'eastbound-oil' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [50.0, 26.5],   // Persian Gulf
          [56.5, 26.3],   // Hormuz
          [60.0, 23.0],   // Arabian Sea
          [70.0, 15.0],   // Indian Ocean
          [80.0, 8.0],    // Sri Lanka
          [95.0, 5.0],    // Malacca approach
          [101.0, 2.5],   // Malacca Strait
          [104.0, 1.3],   // Singapore
          [115.0, 5.0],   // South China Sea
          [120.0, 22.0],  // East China Sea
          [135.0, 34.0],  // Japan
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Persian Gulf → Europe (via Suez)', route: 'westbound-oil' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [50.0, 26.5],   // Persian Gulf
          [56.5, 26.3],   // Hormuz
          [58.0, 22.0],   // Gulf of Oman
          [51.0, 16.0],   // Arabian Sea
          [44.0, 12.8],   // Bab el-Mandeb
          [39.0, 20.0],   // Red Sea
          [33.0, 28.0],   // Suez approach
          [32.3, 30.0],   // Suez Canal
          [30.0, 33.0],   // Mediterranean
          [15.0, 37.0],   // Central Med
          [5.0, 36.5],    // Gibraltar approach
          [-5.0, 40.0],   // Atlantic
          [0.0, 48.0],    // Bay of Biscay
          [-3.0, 52.0],   // English Channel
          [3.0, 51.5],    // Rotterdam
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Cape of Good Hope Route (Suez alternative)', route: 'cape-route' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [44.0, 12.8],   // Bab el-Mandeb
          [48.0, 5.0],    // Horn of Africa
          [45.0, -5.0],   // East Africa
          [40.0, -15.0],  // Mozambique Channel
          [35.0, -25.0],  // South Africa east
          [20.0, -35.0],  // Cape of Good Hope
          [5.0, -30.0],   // South Atlantic
          [-5.0, -10.0],  // West Africa
          [-15.0, 15.0],  // Canary Islands
          [-10.0, 36.0],  // Gibraltar
          [3.0, 51.5],    // Rotterdam
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'US Gulf → Europe (Transatlantic)', route: 'transatlantic' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-90.0, 28.0],  // Gulf of Mexico
          [-85.0, 25.0],  // Florida Strait
          [-75.0, 30.0],  // US East Coast
          [-50.0, 42.0],  // Mid-Atlantic
          [-20.0, 48.0],  // Eastern Atlantic
          [-5.0, 50.0],   // English Channel
          [3.0, 51.5],    // Rotterdam
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'US Gulf → Asia (via Panama)', route: 'panama-asia' },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-90.0, 28.0],  // Gulf of Mexico
          [-85.0, 22.0],  // Caribbean
          [-80.0, 10.0],  // Panama approach
          [-79.7, 9.1],   // Panama Canal
          [-82.0, 5.0],   // Pacific entry
          [-100.0, 10.0], // Eastern Pacific
          [-140.0, 20.0], // Central Pacific
          [-180.0, 25.0], // Date line
          [160.0, 30.0],  // Western Pacific
          [135.0, 34.0],  // Japan
        ],
      },
    },
  ],
}

// ─── Status colours ───────────────────────────────────────────────────────

const STATUS_COLORS_MAP: Record<ChokepointStatus, string> = {
  NORMAL:    '#10b981',  // green
  ELEVATED:  '#f59e0b',  // amber
  DISRUPTED: '#ef4444',  // red
  BLOCKED:   '#dc2626',  // dark red
}

// ─── Types ────────────────────────────────────────────────────────────────

interface LayerState {
  conflicts:   boolean
  chokepoints: boolean
  pipelines:   boolean
  bases:       boolean
  cables:      boolean
  nuclear:     boolean
  lanes:       boolean
  earthquakes: boolean
  sanctions:   boolean
  newsHeat:    boolean
}

interface MarkerRef {
  el:            HTMLElement
  group:         keyof LayerState
  chokepointId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  popup?:        any
}

// ─── Popup HTML ───────────────────────────────────────────────────────────

const ASSET_TYPE_MAP: Record<string, string> = {
  WEAT: 'commodity', UNG: 'commodity', GLD: 'commodity', SLV: 'commodity',
  USO: 'commodity',  BNO: 'commodity', CPER: 'commodity', URA: 'commodity',
  XOM: 'stock', CVX: 'stock', FRO: 'stock',
  BTC: 'crypto', ETH: 'crypto',
}

function assetHref(symbol: string): string {
  const type = ASSET_TYPE_MAP[symbol.toUpperCase()] ?? 'stock'
  return `/asset/${type}/${symbol.toUpperCase()}`
}

function relatedHref(assets: string[]): string {
  return assets.length === 1 ? assetHref(assets[0]) : `/search?q=${assets.join('+')}`
}

function conflictPopup(z: typeof CONFLICT_ZONES[0]) {
  const riskColor = z.risk === 'CRITICAL' ? '#ef4444' : z.risk === 'HIGH' ? '#f97316' : z.risk === 'MEDIUM' ? '#f59e0b' : '#94a3b8'
  const assetBadges = z.assets.map((a) =>
    `<a href="${assetHref(a)}" style="background:#ef444420;border:1px solid #ef444440;color:#fca5a5;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;text-decoration:none;display:inline-block">${a}</a>`
  ).join(' ')
  const footer = z.assets.length
    ? `<a href="${relatedHref(z.assets)}" style="display:block;margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;color:#3b82f6;font-size:10px;font-weight:500;text-decoration:none">View related assets →</a>`
    : ''
  return `
    <div style="min-width:200px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-weight:700;font-size:12px;color:#f1f5f9">${z.name}</span>
        <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:2px;background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}44">${z.risk}</span>
      </div>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;line-height:1.5">${z.description}</p>
      ${z.assets.length ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${assetBadges}</div>` : ''}
      ${footer}
    </div>`
}

function chokepointPopup(c: typeof CHOKEPOINTS[0], status: ChokepointStatus = 'NORMAL') {
  const statusColor = STATUS_COLORS_MAP[status]
  const assetBadges = c.assets.map((a) =>
    `<a href="${assetHref(a)}" style="background:#f59e0b18;border:1px solid #f59e0b33;color:#fcd34d;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;text-decoration:none;display:inline-block">${a}</a>`
  ).join(' ')
  return `
    <div style="min-width:210px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0">${c.name}</p>
        <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:2px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${status}</span>
      </div>
      <div style="font-size:10px;color:#64748b;margin-bottom:6px">
        <span style="color:#fbbf24">${c.traffic} oil</span> · <span style="color:#fbbf24">${c.lngPct} global LNG</span>
      </div>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;line-height:1.5">${c.description}</p>
      ${c.assets.length ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${assetBadges}</div>` : ''}
    </div>`
}

function basePopup(b: typeof MILITARY_BASES[0]) {
  return `
    <div style="min-width:200px">
      <p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0 0 3px">${b.name}</p>
      <span style="font-size:9px;font-weight:600;color:#a78bfa;background:#a78bfa18;border:1px solid #a78bfa33;border-radius:2px;padding:1px 5px">${b.country}</span>
      <p style="font-size:11px;color:#94a3b8;margin:6px 0 0;line-height:1.5">${b.purpose}</p>
    </div>`
}

function sanctionPopup(s: typeof SANCTIONED_COUNTRIES[0]) {
  return `
    <div style="min-width:200px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
        <span style="font-weight:700;font-size:12px;color:#f1f5f9">${escapeHtml(s.name)}</span>
        <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:2px;background:#dc262622;color:#dc2626;border:1px solid #dc262644">${escapeHtml(s.regime)}</span>
      </div>
      <p style="font-size:10px;font-weight:600;color:#fca5a5;margin:0 0 4px">Sectors: ${escapeHtml(s.sectors)}</p>
      <p style="font-size:11px;color:#94a3b8;margin:0;line-height:1.5">${escapeHtml(s.impact)}</p>
    </div>`
}

function earthquakePopupHtml(props: { magnitude: number; place: string; depth: number; time: number; tsunami: boolean }) {
  const ago = Math.round((Date.now() - props.time) / 3600_000)
  const timeStr = ago < 1 ? '<1h ago' : ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`
  const magColor = props.magnitude >= 7 ? '#ef4444' : props.magnitude >= 6 ? '#0891b2' : '#06b6d4'
  const tsunamiTag = props.tsunami ? '<span style="display:block;margin-top:4px;font-size:10px;font-weight:700;color:#ef4444">⚠ TSUNAMI WARNING</span>' : ''
  return `
    <div style="min-width:180px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="font-weight:800;font-size:14px;color:${magColor}">M${props.magnitude.toFixed(1)}</span>
        <span style="font-size:10px;color:#64748b">${escapeHtml(timeStr)}</span>
      </div>
      <p style="font-size:11px;color:#f1f5f9;margin:0 0 3px;font-weight:600">${escapeHtml(props.place)}</p>
      <p style="font-size:10px;color:#94a3b8;margin:0">Depth: ${props.depth.toFixed(1)} km</p>
      ${tsunamiTag}
    </div>`
}

// ─── Region presets ───────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Global',      center: [32, 22]   as [number,number], zoom: 2.0 },
  { label: 'Mid East',    center: [45, 26]   as [number,number], zoom: 4.5 },
  { label: 'Europe',      center: [20, 50]   as [number,number], zoom: 3.5 },
  { label: 'Asia-Pac',    center: [112, 20]  as [number,number], zoom: 2.8 },
  { label: 'Americas',    center: [-85, 15]  as [number,number], zoom: 2.8 },
]

// ─── Component ────────────────────────────────────────────────────────────

export default function GeoMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<unknown>(null)
  const markersRef   = useRef<MarkerRef[]>([])

  const [layers, setLayers] = useState<LayerState>({
    conflicts: true, chokepoints: true, pipelines: true,
    bases: false, cables: false, nuclear: false, lanes: true,
    earthquakes: true, sanctions: false, newsHeat: true,
  })
  const [mapReady,         setMapReady]         = useState(false)
  const [utcTime,          setUtcTime]          = useState('')
  const [chokepointStatus, setChokepointStatus] = useState<Record<string, ChokepointStatus>>({})
  const [earthquakes,      setEarthquakes]      = useState<Earthquake[]>([])
  const [newsHeatPoints,   setNewsHeatPoints]   = useState<NewsHeatPoint[]>([])

  const dragLayers    = useDraggable()
  const dragPipeline  = useDraggable()
  const dragChokeBar  = useDraggable()

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Fetch chokepoint status for dynamic marker colors ────────────────
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res  = await fetch('/api/chokepoints')
        const data = await res.json() as ChokepointIntelPayload
        const map: Record<string, ChokepointStatus> = {}
        for (const cp of data.chokepoints) map[cp.id] = cp.status
        setChokepointStatus(map)
      } catch { /* silent */ }
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 5 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Fetch earthquake data ────────────────────────────────────────────
  useEffect(() => {
    async function fetchQuakes() {
      try {
        const res  = await fetch('/api/earthquakes')
        const data = await res.json() as { earthquakes: Earthquake[] }
        setEarthquakes(data.earthquakes ?? [])
      } catch { /* silent */ }
    }
    fetchQuakes()
    const id = setInterval(fetchQuakes, 10 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Fetch news heat data ───────────────────────────────────────────
  useEffect(() => {
    async function fetchHeat() {
      try {
        const res = await fetch('/api/news-heat')
        const data = await res.json() as { heatPoints: NewsHeatPoint[] }
        setNewsHeatPoints(data.heatPoints ?? [])
      } catch { /* silent */ }
    }
    fetchHeat()
    const id = setInterval(fetchHeat, 10 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Init map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    if (!document.getElementById('maplibre-css')) {
      const link = document.createElement('link')
      link.id  = 'maplibre-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/maplibre-gl@5.20.1/dist/maplibre-gl.css'
      document.head.appendChild(link)
    }

    let map: import('maplibre-gl').Map
    let failsafeTimer: ReturnType<typeof setTimeout>

    import('maplibre-gl').then((mgl) => {
      if (!containerRef.current) return

      map = new mgl.Map({
        container: containerRef.current,
        style:     'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center:    [32, 22],
        zoom:      2.0,
        minZoom:   1.2,
        maxZoom:   14,
        attributionControl: false,
        renderWorldCopies:  false,
      })

      map.addControl(new mgl.NavigationControl({ showCompass: false }), 'bottom-right')
      map.addControl(new mgl.AttributionControl({ compact: true }), 'bottom-right')
      mapRef.current = map

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('error', (e: any) => {
        console.warn('[GeoMap] map error:', e?.error?.message ?? e)
        clearTimeout(failsafeTimer)
        setMapReady(true)
      })

      failsafeTimer = setTimeout(() => setMapReady(true), 12_000)

      map.on('load', () => {
        clearTimeout(failsafeTimer)

        // Pipelines
        map.addSource('pipelines', { type: 'geojson', data: PIPELINES as import('maplibre-gl').GeoJSONSourceSpecification['data'] })
        map.addLayer({ id: 'pipelines-glow', type: 'line', source: 'pipelines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint:  { 'line-color': ['get', 'color'], 'line-width': 8, 'line-opacity': 0.08 } })
        map.addLayer({ id: 'pipelines-line', type: 'line', source: 'pipelines',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint:  { 'line-color': ['get', 'color'], 'line-width': 1.8, 'line-opacity': 0.85, 'line-dasharray': [4, 2] } })

        // Undersea cables
        map.addSource('cables', { type: 'geojson', data: UNDERSEA_CABLES as import('maplibre-gl').GeoJSONSourceSpecification['data'] })
        map.addLayer({ id: 'cables-line', type: 'line', source: 'cables',
          layout: { 'line-join': 'round', visibility: 'none' },
          paint:  { 'line-color': '#8b5cf6', 'line-width': 1, 'line-opacity': 0.6, 'line-dasharray': [2, 3] } })

        // Shipping lanes
        map.addSource('shipping-lanes', { type: 'geojson', data: SHIPPING_LANES as import('maplibre-gl').GeoJSONSourceSpecification['data'] })
        map.addLayer({ id: 'shipping-lanes-layer', type: 'line', source: 'shipping-lanes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint:  { 'line-color': '#64748b', 'line-opacity': 0.15, 'line-width': 1.5, 'line-dasharray': [4, 4] } })

        // Conflict zones
        for (const z of CONFLICT_ZONES) {
          const sz   = z.severity
          const size = 10 + sz * 4
          const col  = sz === 3 ? '#ef4444' : sz === 2 ? '#f97316' : '#f59e0b'
          const el   = document.createElement('div')
          el.className = 'conflict-marker'
          el.style.width  = `${size}px`
          el.style.height = `${size}px`
          el.innerHTML = `
            <div class="conflict-marker-ring" style="background:${col}50"></div>
            <div class="conflict-marker-ring conflict-marker-ring-2" style="background:${col}35"></div>
            <div class="conflict-marker-dot" style="background:${col};border-color:${col}70;width:${size}px;height:${size}px"></div>`
          const popup = new mgl.Popup({ offset: 14, closeButton: true, maxWidth: '260px' }).setHTML(conflictPopup(z))
          new mgl.Marker({ element: el }).setLngLat([z.lng, z.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'conflicts' })
        }

        // Chokepoints — diamond shape (⬥) with status glow
        for (const c of CHOKEPOINTS) {
          const el = document.createElement('div')
          Object.assign(el.style, {
            width: '10px', height: '10px', transform: 'rotate(45deg)',
            background: '#10b981', border: '1.5px solid rgba(16,185,129,0.6)',
            cursor: 'pointer', boxShadow: '0 0 8px rgba(16,185,129,0.4)',
          })
          const popup = new mgl.Popup({ offset: 14, closeButton: true, maxWidth: '270px' }).setHTML(chokepointPopup(c))
          new mgl.Marker({ element: el }).setLngLat([c.lng, c.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'chokepoints', chokepointId: c.id, popup })
        }

        // Military bases — crosshair shape (+)
        for (const b of MILITARY_BASES) {
          const el = document.createElement('div')
          Object.assign(el.style, {
            width: '12px', height: '12px', cursor: 'pointer', position: 'relative',
          })
          el.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="6" y1="1" x2="6" y2="11" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="1" y1="6" x2="11" y2="6" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="6" cy="6" r="2" fill="#a78bfa" opacity="0.4"/>
          </svg>`
          const popup = new mgl.Popup({ offset: 12, closeButton: true, maxWidth: '250px' }).setHTML(basePopup(b))
          new mgl.Marker({ element: el }).setLngLat([b.lng, b.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'bases' })
        }

        // Nuclear sites — warning triangle (▲)
        for (const n of NUCLEAR_SITES) {
          const el = document.createElement('div')
          Object.assign(el.style, {
            width: '14px', height: '13px', cursor: 'pointer', display: 'none',
          })
          el.innerHTML = `<svg width="14" height="13" viewBox="0 0 14 13" fill="none">
            <path d="M7 1L13 12H1L7 1Z" fill="#facc15" fill-opacity="0.25" stroke="#facc15" stroke-width="1.2" stroke-linejoin="round"/>
            <circle cx="7" cy="8" r="1.2" fill="#facc15"/>
          </svg>`
          const popup = new mgl.Popup({ offset: 12, closeButton: true, maxWidth: '240px' })
            .setHTML(`<div style="min-width:190px"><div style="display:flex;align-items:center;gap:5px;margin-bottom:3px"><span style="font-size:11px">☢</span><p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0">${n.name}</p></div><span style="font-size:9px;font-weight:600;color:#fbbf24;background:#fbbf2418;border:1px solid #fbbf2433;border-radius:2px;padding:1px 5px">${n.country}</span><p style="font-size:11px;color:#94a3b8;margin:6px 0 0;line-height:1.5">${n.note}</p></div>`)
          new mgl.Marker({ element: el }).setLngLat([n.lng, n.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'nuclear' })
        }

        // Sanctions — dashed border "restricted zone" circles
        for (const s of SANCTIONED_COUNTRIES) {
          const el = document.createElement('div')
          Object.assign(el.style, {
            width: '36px', height: '36px', cursor: 'pointer', display: 'none',
          })
          el.innerHTML = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" fill="#991b1b" fill-opacity="0.08" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity="0.5"/>
            <line x1="8" y1="8" x2="28" y2="28" stroke="#dc2626" stroke-width="1" stroke-opacity="0.3"/>
          </svg>`
          const popup = new mgl.Popup({ offset: 20, closeButton: true, maxWidth: '270px' }).setHTML(sanctionPopup(s))
          new mgl.Marker({ element: el }).setLngLat([s.lng, s.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'sanctions' })
        }

        // Earthquakes — teal concentric rings (seismic wave effect)
        map.addSource('earthquakes', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        // Outer ring — faint wave
        map.addLayer({
          id: 'earthquake-outer',
          type: 'circle',
          source: 'earthquakes',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 4.5, 12, 6, 24, 7, 36, 8, 48],
            'circle-color': 'transparent',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#06b6d4',
            'circle-stroke-opacity': 0.2,
          },
        })
        // Inner dot
        map.addLayer({
          id: 'earthquake-circles',
          type: 'circle',
          source: 'earthquakes',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 4.5, 4, 6, 8, 7, 12, 8, 18],
            'circle-color': '#06b6d4',
            'circle-opacity': 0.7,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#22d3ee',
            'circle-stroke-opacity': 0.4,
          },
        })

        // Earthquake click popup
        map.on('click', 'earthquake-circles', (e: import('maplibre-gl').MapMouseEvent & { features?: import('maplibre-gl').MapGeoJSONFeature[] }) => {
          const f = e.features?.[0]
          if (!f || f.geometry.type !== 'Point') return
          const props = f.properties as { magnitude: number; place: string; depth: number; time: number; tsunami: boolean }
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
          new mgl.Popup({ closeButton: true, maxWidth: '250px' })
            .setLngLat(coords)
            .setHTML(earthquakePopupHtml(props))
            .addTo(map)
        })
        map.on('mouseenter', 'earthquake-circles', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'earthquake-circles', () => { map.getCanvas().style.cursor = '' })

        // News heat — warm amber blurred blobs (clearly "heat" not markers)
        map.addSource('news-heat', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'news-heat-circles',
          type: 'circle',
          source: 'news-heat',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 20, 50, 40, 100, 65],
            'circle-color': '#fbbf24',
            'circle-opacity': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0.03, 50, 0.08, 100, 0.18],
            'circle-blur': 1,
          },
        })

        // News heat click popup
        map.on('click', 'news-heat-circles', (e: import('maplibre-gl').MapMouseEvent & { features?: import('maplibre-gl').MapGeoJSONFeature[] }) => {
          const f = e.features?.[0]
          if (!f || f.geometry.type !== 'Point') return
          const p = f.properties as { region: string; intensity: number; count: number }
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
          new mgl.Popup({ closeButton: true, maxWidth: '200px' })
            .setLngLat(coords)
            .setHTML(`<div style="min-width:120px"><p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0 0 3px">${escapeHtml(p.region)}</p><p style="font-size:10px;color:#fbbf24;margin:0">${p.count} article mentions</p><p style="font-size:9px;color:#64748b;margin:2px 0 0">Intensity: ${p.intensity}/100</p></div>`)
            .addTo(map)
        })
        map.on('mouseenter', 'news-heat-circles', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'news-heat-circles', () => { map.getCanvas().style.cursor = '' })

        setMapReady(true)
      })
    })

    return () => {
      clearTimeout(failsafeTimer)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map as any)?.remove?.()
      mapRef.current     = null
      markersRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update chokepoint marker colors + popup HTML when status changes ─
  useEffect(() => {
    if (!mapReady) return
    for (const m of markersRef.current) {
      if (m.group === 'chokepoints' && m.chokepointId) {
        const status = chokepointStatus[m.chokepointId] ?? 'NORMAL'
        const color  = STATUS_COLORS_MAP[status]
        m.el.style.background  = color
        m.el.style.borderColor = `${color}99`
        m.el.style.boxShadow   = status !== 'NORMAL'
          ? `0 0 14px ${color}aa`
          : `0 0 8px ${color}55`
        if (m.popup) {
          const def = CHOKEPOINTS.find(c => c.id === m.chokepointId)
          if (def) m.popup.setHTML(chokepointPopup(def, status))
        }
      }
    }
  }, [chokepointStatus, mapReady])

  // ── Update earthquake GeoJSON when data arrives ─────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !earthquakes.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mapRef.current as any
    const src = m.getSource?.('earthquakes')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: earthquakes.map((q: Earthquake) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [q.lng, q.lat] },
        properties: {
          id: q.id,
          magnitude: q.magnitude,
          place: q.place,
          depth: q.depth,
          time: q.time,
          tsunami: q.tsunami,
        },
      })),
    })
  }, [earthquakes, mapReady])

  // ── Update news heat GeoJSON when data arrives ─────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !newsHeatPoints.length) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mapRef.current as any
    const src = m.getSource?.('news-heat')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: newsHeatPoints.map((hp: NewsHeatPoint) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [hp.lng, hp.lat] },
        properties: { region: hp.region, intensity: hp.intensity, count: hp.articleCount },
      })),
    })
  }, [newsHeatPoints, mapReady])

  // ── Sync layer visibility ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m   = mapRef.current as any
    const vis = (v: boolean) => (v ? 'visible' : 'none')
    if (m.getLayer?.('pipelines-line')) {
      m.setLayoutProperty('pipelines-line', 'visibility', vis(layers.pipelines))
      m.setLayoutProperty('pipelines-glow', 'visibility', vis(layers.pipelines))
    }
    if (m.getLayer?.('cables-line')) {
      m.setLayoutProperty('cables-line', 'visibility', vis(layers.cables))
    }
    if (m.getLayer?.('shipping-lanes-layer')) {
      m.setLayoutProperty('shipping-lanes-layer', 'visibility', vis(layers.lanes))
    }
    if (m.getLayer?.('earthquake-circles')) {
      m.setLayoutProperty('earthquake-circles', 'visibility', vis(layers.earthquakes))
      m.setLayoutProperty('earthquake-outer', 'visibility', vis(layers.earthquakes))
    }
    if (m.getLayer?.('news-heat-circles')) {
      m.setLayoutProperty('news-heat-circles', 'visibility', vis(layers.newsHeat))
    }
    for (const { el, group } of markersRef.current) {
      el.style.display = layers[group] ? '' : 'none'
    }
  }, [layers, mapReady])

  // ── Fly to preset ────────────────────────────────────────────────────
  function flyTo(center: [number, number], zoom: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mapRef.current as any)?.flyTo?.({ center, zoom, duration: 1000, essential: true })
  }

  const LAYER_CFG = [
    { key: 'conflicts'   as keyof LayerState, label: 'Conflict Zones',  dot: '#ef4444' },
    { key: 'chokepoints' as keyof LayerState, label: 'Chokepoints',     dot: '#f59e0b' },
    { key: 'pipelines'   as keyof LayerState, label: 'Pipelines',       dot: '#3b82f6' },
    { key: 'lanes'       as keyof LayerState, label: 'Shipping Lanes',  dot: '#3b82f6' },
    { key: 'bases'       as keyof LayerState, label: 'Military Bases',  dot: '#a78bfa' },
    { key: 'cables'      as keyof LayerState, label: 'Undersea Cables', dot: '#8b5cf6' },
    { key: 'nuclear'     as keyof LayerState, label: 'Nuclear Sites',   dot: '#facc15' },
    { key: 'earthquakes' as keyof LayerState, label: 'Earthquakes',     dot: '#06b6d4' },
    { key: 'sanctions'   as keyof LayerState, label: 'Sanctions',       dot: '#dc2626' },
    { key: 'newsHeat'    as keyof LayerState, label: 'News Heat',       dot: '#fbbf24' },
  ] as const

  const PIPELINE_LEGEND = [
    { name: 'Druzhba',       color: '#3b82f6', status: 'Active'  },
    { name: 'BTC Pipeline',  color: '#22c55e', status: 'Active'  },
    { name: 'Trans-Arabian', color: '#f59e0b', status: 'Inactive'},
    { name: 'Keystone',      color: '#ef4444', status: 'Active'  },
    { name: 'Nord Stream',   color: '#64748b', status: 'Damaged' },
  ]

  // Key chokepoints to show in the footer status bar
  const FOOTER_CHOKEPOINTS = [
    { label: 'HORMUZ',   id: 'hormuz'      },
    { label: 'SUEZ',     id: 'suez'        },
    { label: 'MALACCA',  id: 'malacca'     },
    { label: 'BAB-EL',   id: 'babelMandeb' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Map canvas */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {/* Radar sweep — pure CSS, very low opacity */}
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          <div
            className="radar-sweep absolute"
            style={{
              inset: '-50%',
              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 340deg, rgba(16,185,129,0.04) 355deg, transparent 360deg)',
            }}
          />
        </div>

        {/* Top-left: UTC clock + live dot */}
        <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-sm">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-white/70">
            {utcTime} UTC
          </span>
        </div>

        {/* Layer toggles — top right (draggable) */}
        <div
          ref={dragLayers.ref}
          onPointerDown={dragLayers.onPointerDown}
          onPointerMove={dragLayers.onPointerMove}
          onPointerUp={dragLayers.onPointerUp}
          className="absolute right-1.5 top-1.5 z-20 flex flex-col gap-px"
          style={{ cursor: 'grab' }}
        >
          <div className="rounded border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md shadow-black/50">
            <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">Layers</p>
            {LAYER_CFG.map(({ key, label, dot }) => (
              <label key={key} className="flex cursor-pointer items-center gap-1.5 py-0.5">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={() => setLayers((p) => ({ ...p, [key]: !p[key] }))}
                  className="h-2.5 w-2.5 cursor-pointer accent-blue-500"
                />
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: layers[key] ? dot : 'rgba(255,255,255,0.15)' }} />
                <span className={`font-mono text-[9px] ${layers[key] ? 'text-white/70' : 'text-white/25'}`}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pipeline legend — bottom left (draggable) */}
        {layers.pipelines && (
          <div
            ref={dragPipeline.ref}
            onPointerDown={dragPipeline.onPointerDown}
            onPointerMove={dragPipeline.onPointerMove}
            onPointerUp={dragPipeline.onPointerUp}
            className="absolute bottom-6 left-1.5 z-10 rounded border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md shadow-black/50"
            style={{ cursor: 'grab' }}
          >
            <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white/30">Pipelines</p>
            {PIPELINE_LEGEND.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 py-0.5">
                <span className="inline-block h-px w-4 rounded" style={{ background: p.color }} />
                <span className="font-mono text-[9px] text-white/55">{p.name}</span>
                <span className="font-mono text-[8px] text-white/25">{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chokepoint status bar — bottom center (draggable) */}
        <div
          ref={dragChokeBar.ref}
          onPointerDown={dragChokeBar.onPointerDown}
          onPointerMove={dragChokeBar.onPointerMove}
          onPointerUp={dragChokeBar.onPointerUp}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 rounded border border-white/10 bg-black/70 px-3 py-1.5 backdrop-blur-sm"
          style={{ cursor: 'grab' }}
        >
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-white/30">
            Chokepoints
          </span>
          {FOOTER_CHOKEPOINTS.map(cp => {
            const status = chokepointStatus[cp.id] ?? 'NORMAL'
            const color  = STATUS_COLORS_MAP[status]
            return (
              <div key={cp.id} className="flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status !== 'NORMAL' ? 'live-dot' : ''}`}
                  style={{ background: color }}
                />
                <span className="font-mono text-[9px] font-bold" style={{ color }}>
                  {cp.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Loading */}
        {!mapReady && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0a0e17]">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/25">LOADING MAP…</span>
          </div>
        )}
      </div>

      {/* Region preset buttons */}
      <div className="flex items-center gap-1 border-t border-[var(--border)] px-2 py-1.5">
        <span className="mr-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Jump:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => flyTo(p.center, p.zoom)}
            className="rounded border border-[var(--border)] px-2 py-0.5 font-mono text-[9px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
