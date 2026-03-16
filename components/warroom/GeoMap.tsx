'use client'

import { useEffect, useRef, useState } from 'react'
import type { Ship, MaritimeData } from '@/lib/api/maritime'

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
]

const CHOKEPOINTS = [
  { id: 'hormuz',    name: 'Strait of Hormuz',     lat: 26.6,  lng: 56.2,
    traffic: '~21M bbl/day', oilPct: '21%', lngPct: '17%',
    description: 'World\'s most critical oil chokepoint. Iranian closure threat would spike Brent above $120.',
    assets: ['USO', 'BNO', 'XOM', 'CVX'] },
  { id: 'suez',      name: 'Suez Canal',            lat: 30.0,  lng: 32.3,
    traffic: '~50 ships/day', oilPct: '9%', lngPct: '8%',
    description: 'Disruption adds 10–14 days via Cape of Good Hope route, raising freight costs 40%.',
    assets: ['USO', 'FRO'] },
  { id: 'malacca',   name: 'Strait of Malacca',     lat: 2.5,   lng: 101.8,
    traffic: '~80K vessels/yr', oilPct: '40%', lngPct: '—',
    description: '40% of global trade. Blockage would strangle Asia-Pacific energy supply.',
    assets: ['USO', 'UNG'] },
  { id: 'bab',       name: 'Bab el-Mandeb',         lat: 12.6,  lng: 43.3,
    traffic: '~6.2M bbl/day', oilPct: '6%', lngPct: '3%',
    description: 'Houthi threats have already rerouted major shipping volumes away from Red Sea.',
    assets: ['USO', 'BNO'] },
  { id: 'bosphorus', name: 'Turkish Straits',        lat: 41.0,  lng: 29.0,
    traffic: '~50K vessels/yr', oilPct: '3%', lngPct: '—',
    description: 'Sole Black Sea exit. Controls Russian and Kazakh oil and Ukrainian grain exports.',
    assets: ['WEAT', 'USO'] },
  { id: 'panama',    name: 'Panama Canal',           lat: 9.1,   lng: -79.7,
    traffic: '~14K vessels/yr', oilPct: '1%', lngPct: '11%',
    description: 'Drought-reduced capacity. US LNG exports to Asia-Pacific significantly impacted.',
    assets: ['UNG', 'WEAT'] },
  { id: 'capeofgood', name: 'Cape of Good Hope',     lat: -34.3, lng: 18.5,
    traffic: '~20K vessels/yr', oilPct: '5%', lngPct: '—',
    description: 'Alternative route when Suez disrupted. Adds 14 days and 30–40% extra fuel costs.',
    assets: ['USO'] },
  { id: 'danish',    name: 'Danish Straits',         lat: 55.7,  lng: 11.0,
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
]

// ─── Types ────────────────────────────────────────────────────────────────

interface LayerState {
  conflicts:   boolean
  chokepoints: boolean
  pipelines:   boolean
  bases:       boolean
  cables:      boolean
  nuclear:     boolean
  ships:       boolean
}

// ─── Ship category colors ──────────────────────────────────────────────────

const SHIP_COLORS: Record<string, string> = {
  tanker:   '#f97316',
  lng:      '#a855f7',
  cargo:    '#3b82f6',
  military: '#ef4444',
}

function shipColor(category: string): string {
  return SHIP_COLORS[category] ?? '#666666'
}

function shipPopup(s: Ship): string {
  const color  = shipColor(s.category)
  const status = s.status === 'REROUTED'
    ? `<span style="background:#ef444420;border:1px solid #ef444440;color:#fca5a5;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700">${s.status}</span>`
    : `<span style="background:#10b98120;border:1px solid #10b98130;color:#6ee7b7;border-radius:3px;padding:1px 5px;font-size:9px;font-weight:700">${s.status}</span>`
  return `
    <div style="min-width:190px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <div style="width:8px;height:8px;background:${color};clip-path:polygon(50% 0%,100% 100%,0% 100%);transform:rotate(${s.heading}deg);flex-shrink:0"></div>
        <span style="font-weight:700;font-size:12px;color:#f1f5f9">${s.name}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-size:10px;margin-bottom:6px">
        <div style="color:#64748b">Type: <span style="color:#e2e8f0">${s.type}</span></div>
        <div style="color:#64748b">Flag: <span style="color:#e2e8f0">${s.flag}</span></div>
        <div style="color:#64748b">Speed: <span style="color:#e2e8f0">${s.speed} kn</span></div>
        <div style="color:#64748b">HDG: <span style="color:#e2e8f0">${s.heading}°</span></div>
        <div style="color:#64748b">Cargo: <span style="color:#e2e8f0">${s.cargo}</span></div>
        <div style="color:#64748b">To: <span style="color:#e2e8f0">${s.destination}</span></div>
      </div>
      ${status}
    </div>`
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

function chopointPopup(c: typeof CHOKEPOINTS[0]) {
  const assetBadges = c.assets.map((a) =>
    `<a href="${assetHref(a)}" style="background:#f59e0b18;border:1px solid #f59e0b33;color:#fcd34d;border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600;text-decoration:none;display:inline-block">${a}</a>`
  ).join(' ')
  const footer = c.assets.length
    ? `<a href="${relatedHref(c.assets)}" style="display:block;margin-top:6px;padding-top:6px;border-top:1px solid #1e293b;color:#3b82f6;font-size:10px;font-weight:500;text-decoration:none">View related assets →</a>`
    : ''
  return `
    <div style="min-width:210px">
      <p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0 0 5px">${c.name}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:6px">
        <div style="font-size:10px;color:#64748b">Oil/day: <span style="color:#fbbf24">${c.traffic}</span></div>
        <div style="font-size:10px;color:#64748b">% Global oil: <span style="color:#fbbf24">${c.oilPct}</span></div>
      </div>
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;line-height:1.5">${c.description}</p>
      ${c.assets.length ? `<div style="display:flex;flex-wrap:wrap;gap:3px">${assetBadges}</div>` : ''}
      ${footer}
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
  const markersRef   = useRef<{ el: HTMLElement; group: keyof LayerState }[]>([])

  const [layers, setLayers] = useState<LayerState>({
    conflicts: true, chokepoints: true, pipelines: true,
    bases: false, cables: false, nuclear: false, ships: true,
  })
  const [mapReady,    setMapReady]    = useState(false)
  const [utcTime,     setUtcTime]     = useState('')
  const [shipData,    setShipData]    = useState<MaritimeData | null>(null)

  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 25))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Fetch maritime traffic ────────────────────────────────────────────
  useEffect(() => {
    async function fetchShips() {
      try {
        const res  = await fetch('/api/maritime')
        const data = await res.json() as MaritimeData
        setShipData(data)
      } catch { /* silent */ }
    }
    fetchShips()
    const id = setInterval(fetchShips, 5 * 60 * 1000)
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

      // If the tile server is unreachable or style fails, clear the loading spinner
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.on('error', (e: any) => {
        console.warn('[GeoMap] map error:', e?.error?.message ?? e)
        clearTimeout(failsafeTimer)
        setMapReady(true)
      })

      // Hard failsafe: show map container after 12 s regardless
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

        // Chokepoints
        for (const c of CHOKEPOINTS) {
          const el = document.createElement('div')
          el.className = 'chokepoint-marker'
          const popup = new mgl.Popup({ offset: 14, closeButton: true, maxWidth: '270px' }).setHTML(chopointPopup(c))
          new mgl.Marker({ element: el }).setLngLat([c.lng, c.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'chokepoints' })
        }

        // Military bases
        for (const b of MILITARY_BASES) {
          const el = document.createElement('div')
          Object.assign(el.style, { width:'9px', height:'9px', background:'transparent', border:'2px solid #a78bfa', transform:'rotate(45deg)', cursor:'pointer', boxShadow:'0 0 6px #7c3aed66' })
          const popup = new mgl.Popup({ offset: 12, closeButton: true, maxWidth: '250px' }).setHTML(basePopup(b))
          new mgl.Marker({ element: el }).setLngLat([b.lng, b.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'bases' })
        }

        // Nuclear sites
        for (const n of NUCLEAR_SITES) {
          const el = document.createElement('div')
          Object.assign(el.style, { width:'10px', height:'10px', background:'#facc15', borderRadius:'50%', border:'2px solid #a16207', cursor:'pointer', boxShadow:'0 0 8px #ca8a0466', display:'none' })
          const popup = new mgl.Popup({ offset: 12, closeButton: true, maxWidth: '240px' })
            .setHTML(`<div style="min-width:190px"><p style="font-weight:700;font-size:12px;color:#f1f5f9;margin:0 0 3px">${n.name}</p><span style="font-size:9px;color:#fbbf24">${n.country}</span><p style="font-size:11px;color:#94a3b8;margin:6px 0 0;line-height:1.5">${n.note}</p></div>`)
          new mgl.Marker({ element: el }).setLngLat([n.lng, n.lat]).setPopup(popup).addTo(map)
          markersRef.current.push({ el, group: 'nuclear' })
        }

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

  // ── Add/refresh ship markers when data arrives ───────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !shipData) return

    // Remove existing ship markers
    const remaining = markersRef.current.filter(({ el, group }) => {
      if (group === 'ships') { el.remove(); return false }
      return true
    })
    markersRef.current = remaining

    import('maplibre-gl').then((mgl) => {
      const map = mapRef.current as import('maplibre-gl').Map
      for (const ship of shipData.ships) {
        const color   = shipColor(ship.category)
        const el      = document.createElement('div')
        const size    = 10
        Object.assign(el.style, {
          width:           `${size}px`,
          height:          `${size}px`,
          cursor:          'pointer',
          display:         layers.ships ? '' : 'none',
          // SVG triangle rotated to heading
          background:      'transparent',
        })
        // Use an SVG data URI for the ship triangle
        el.innerHTML = `<svg viewBox="0 0 10 14" width="${size}" height="${size + 4}" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${ship.heading}deg);filter:drop-shadow(0 0 2px ${color}80)">
          <polygon points="5,0 10,14 5,11 0,14" fill="${color}" opacity="0.9"/>
        </svg>`

        const popup = new mgl.Popup({ offset: 12, closeButton: true, maxWidth: '240px' }).setHTML(shipPopup(ship))
        new mgl.Marker({ element: el }).setLngLat([ship.lng, ship.lat]).setPopup(popup).addTo(map)
        markersRef.current.push({ el, group: 'ships' })
      }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipData, mapReady])

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
    { key: 'conflicts'  as keyof LayerState, label: 'Conflict Zones', dot: '#ef4444' },
    { key: 'chokepoints'as keyof LayerState, label: 'Chokepoints',    dot: '#f59e0b' },
    { key: 'pipelines'  as keyof LayerState, label: 'Pipelines',      dot: '#3b82f6' },
    { key: 'bases'      as keyof LayerState, label: 'Military Bases', dot: '#a78bfa' },
    { key: 'cables'     as keyof LayerState, label: 'Undersea Cables',dot: '#8b5cf6' },
    { key: 'nuclear'    as keyof LayerState, label: 'Nuclear Sites',  dot: '#facc15' },
    { key: 'ships'      as keyof LayerState, label: 'Ships',          dot: '#f97316' },
  ] as const

  const PIPELINE_LEGEND = [
    { name: 'Druzhba',       color: '#3b82f6', status: 'Active'  },
    { name: 'BTC Pipeline',  color: '#22c55e', status: 'Active'  },
    { name: 'Trans-Arabian', color: '#f59e0b', status: 'Inactive'},
    { name: 'Keystone',      color: '#ef4444', status: 'Active'  },
    { name: 'Nord Stream',   color: '#64748b', status: 'Damaged' },
  ]

  return (
    <div className="flex flex-col" style={{ height: 'clamp(400px, 55vw, 600px)' }}>
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

        {/* Layer toggles — top right */}
        <div className="absolute right-1.5 top-1.5 z-20 flex flex-col gap-px">
          <div className="rounded border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md shadow-xl">
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

        {/* Pipeline legend — bottom left */}
        {layers.pipelines && (
          <div className="absolute bottom-6 left-1.5 z-10 rounded border border-white/10 bg-black/60 px-2 py-1.5 backdrop-blur-md shadow-xl">
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

        {/* Ship legend — bottom center */}
        {layers.ships && shipData && (
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur-md shadow-xl">
            <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white/30">Vessels by Chokepoint</p>
            <div className="flex items-center gap-3">
              {[
                { label: 'HORMUZ',   count: shipData.chokepoints.hormuz,      color: '#f59e0b' },
                { label: 'SUEZ',     count: shipData.chokepoints.suez,         color: '#3b82f6' },
                { label: 'MALACCA',  count: shipData.chokepoints.malacca,      color: '#10b981' },
                { label: 'BAB-EL',   count: shipData.chokepoints.babelMandeb,  color: '#ef4444' },
              ].map((cp) => (
                <div key={cp.label} className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-bold" style={{ color: cp.color }}>{cp.label}</span>
                  <span className="font-mono text-[9px] text-white/60">·</span>
                  <span className="font-mono text-[9px] font-bold text-white/80">{cp.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {!mapReady && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0a0e17]">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/25">LOADING MAP…</span>
          </div>
        )}
      </div>

      {/* Region preset buttons */}
      <div className="flex items-center gap-1 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
        <span className="mr-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Jump:</span>
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
