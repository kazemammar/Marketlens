'use client'

import { useFetch } from '@/lib/hooks/useFetch'
import type { ChokepointIntelPayload, ChokepointStatus } from '@/lib/api/chokepoints'

// ─── Static intel data (mirrored from GeoMap.tsx) ─────────────────────────

const CONFLICT_ZONES = [
  { id: 'ukraine', name: 'Ukraine–Russia War', severity: 3,
    status: 'Active', description: 'Ongoing conventional war. Major grain, gas, and steel supply disruption.',
    assets: ['WEAT', 'UNG', 'SLV'], risk: 'CRITICAL' },
  { id: 'gaza', name: 'Gaza Conflict', severity: 3,
    status: 'Active', description: 'Conflict with regional escalation risk. Proximity to Israeli energy infrastructure.',
    assets: ['GLD', 'USO'], risk: 'HIGH' },
  { id: 'redsea', name: 'Red Sea / Yemen', severity: 2,
    status: 'Active', description: 'Houthi attacks forcing rerouting. 12% of global trade affected.',
    assets: ['USO', 'BNO', 'XOM'], risk: 'HIGH' },
  { id: 'syria', name: 'Syria Transition', severity: 1,
    status: 'Ongoing', description: 'Post-Assad reconstruction. Pipeline and refugee spillover risk.',
    assets: ['USO'], risk: 'MEDIUM' },
  { id: 'sudan', name: 'Sudan Civil War', severity: 2,
    status: 'Active', description: 'SAF vs RSF. Nile basin and gold production instability.',
    assets: ['GLD'], risk: 'HIGH' },
  { id: 'myanmar', name: 'Myanmar Civil War', severity: 1,
    status: 'Ongoing', description: 'Military vs resistance. Rare earth and gas exports disrupted.',
    assets: ['UNG'], risk: 'MEDIUM' },
] as const

const CHOKEPOINTS = [
  { id: 'hormuz',   name: 'Strait of Hormuz',   traffic: '~21M bbl/day', oilPct: '21%', lngPct: '17%',
    description: "World's most critical oil chokepoint. Iranian closure threat would spike Brent above $120.",
    assets: ['USO', 'BNO'], shipKey: 'hormuz' as const },
  { id: 'suez',     name: 'Suez Canal',           traffic: '~50 ships/day', oilPct: '9%',  lngPct: '8%',
    description: 'Disruption adds 10–14 days via Cape of Good Hope, raising freight costs 40%.',
    assets: ['USO'], shipKey: 'suez' as const },
  { id: 'malacca',  name: 'Strait of Malacca',    traffic: '~80K vessels/yr', oilPct: '40%', lngPct: '—',
    description: '40% of global trade. Blockage would strangle Asia-Pacific energy supply.',
    assets: ['USO', 'UNG'], shipKey: 'malacca' as const },
  { id: 'bab',      name: 'Bab el-Mandeb',        traffic: '~6.2M bbl/day', oilPct: '6%',  lngPct: '3%',
    description: 'Houthi threats have already rerouted major shipping volumes away from Red Sea.',
    assets: ['USO', 'BNO'], shipKey: 'babelMandeb' as const },
  { id: 'bosphorus',name: 'Turkish Straits',       traffic: '~50K vessels/yr', oilPct: '3%', lngPct: '—',
    description: 'Sole Black Sea exit. Controls Russian and Kazakh oil and Ukrainian grain exports.',
    assets: ['WEAT', 'USO'], shipKey: null },
  { id: 'panama',   name: 'Panama Canal',          traffic: '~14K vessels/yr', oilPct: '1%', lngPct: '11%',
    description: 'Drought-reduced capacity. US LNG exports to Asia-Pacific significantly impacted.',
    assets: ['UNG', 'WEAT'], shipKey: null },
]

const PIPELINES = [
  { name: 'Druzhba',        color: '#3b82f6', status: 'active',   capacity: '1.2M bbl/day',  assets: ['USO'] },
  { name: 'BTC Pipeline',   color: '#22c55e', status: 'active',   capacity: '1.2M bbl/day',  assets: ['USO'] },
  { name: 'Trans-Arabian',  color: '#f59e0b', status: 'inactive', capacity: '0.5M bbl/day',  assets: ['USO'] },
  { name: 'Keystone',       color: '#ef4444', status: 'active',   capacity: '0.6M bbl/day',  assets: ['USO'] },
  { name: 'Nord Stream',    color: '#64748b', status: 'damaged',  capacity: '0 (damaged)',    assets: ['UNG'] },
]

// ─── Commodity configuration ──────────────────────────────────────────────

// ─── Color helpers ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<number, string> = { 3: 'var(--danger)', 2: '#f97316', 1: 'var(--warning)' }
const RISK_COLOR: Record<string, string> = {
  CRITICAL: 'var(--danger)', HIGH: '#f97316', MEDIUM: 'var(--warning)', LOW: 'var(--text-muted)',
}
const CHOKEPOINT_STATUS_COLOR: Record<ChokepointStatus, string> = {
  NORMAL:    'var(--accent)',
  ELEVATED:  'var(--warning)',
  DISRUPTED: 'var(--danger)',
  BLOCKED:   '#dc2626',
}
const PIPELINE_STATUS_COLOR: Record<string, string> = {
  active:   '#22c55e',
  inactive: '#f59e0b',
  damaged:  '#ef4444',
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
    </div>
  )
}

function RiskDot({ severity }: { severity: number }) {
  const color = SEVERITY_COLOR[severity] ?? '#64748b'
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {severity >= 2 && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function CommodityIntel({ symbol }: { symbol: string }) {
  const { data: intel } = useFetch<ChokepointIntelPayload>('/api/chokepoints', { refreshInterval: 5 * 60_000 })

  const sym        = symbol.toUpperCase()
  const isPipeline = ['USO', 'BNO', 'UNG'].includes(sym)

  const matchedConflicts   = CONFLICT_ZONES.filter(z => z.assets.includes(sym as never))
  const matchedChokepoints = CHOKEPOINTS.filter(c => c.assets.includes(sym as never))
  const matchedPipelines   = PIPELINES.filter(p => p.assets.includes(sym))

  // Nothing to show
  if (matchedConflicts.length === 0 && matchedChokepoints.length === 0 && matchedPipelines.length === 0) {
    return null
  }

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Commodity Intelligence — {sym}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[9px] text-[var(--text-muted)]">
          GEOPOLITICAL RISK BRIEFING
        </span>
      </div>

      {/* ── Section 1: Active Threats ─────────────────────────────────────── */}
      {matchedConflicts.length > 0 && (
        <div className="bg-[var(--surface)]">
          <SectionHeader label="Active Threats" />
          <div className="divide-y divide-[var(--border)]">
            {matchedConflicts.map(zone => {
              const sColor = SEVERITY_COLOR[zone.severity] ?? '#64748b'
              const rColor = RISK_COLOR[zone.risk]         ?? '#64748b'
              return (
                <div
                  key={zone.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderLeft: `2px solid ${sColor}` }}
                >
                  <RiskDot severity={zone.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11px] font-bold text-[var(--text)]">{zone.name}</span>
                      <span
                        className="rounded-sm px-1.5 py-px font-mono text-[8px] font-bold uppercase"
                        style={{ background: `${sColor}18`, color: sColor, border: `1px solid ${sColor}33` }}
                      >
                        {zone.status}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)]">
                      {zone.description}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                    style={{ background: `${rColor}18`, color: rColor, border: `1px solid ${rColor}33` }}
                  >
                    {zone.risk}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Section 2: Chokepoints & Maritime ────────────────────────────── */}
      {matchedChokepoints.length > 0 && (
        <div className="bg-[var(--surface)]">
          <SectionHeader label="Chokepoints & Maritime" />

          {/* Chokepoint grid */}
          <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2">
            {matchedChokepoints.map(cp => {
              const liveItem  = intel?.chokepoints.find(c => c.id === cp.id || c.id === cp.shipKey)
              const status    = liveItem?.status ?? 'NORMAL'
              const color     = CHOKEPOINT_STATUS_COLOR[status]
              return (
                <div key={cp.id} className="bg-[var(--surface)] px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-[var(--text)]">{cp.name}</span>
                    <span
                      className="shrink-0 rounded-sm px-1.5 py-px font-mono text-[8px] font-bold uppercase"
                      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex gap-3 mb-1.5 font-mono text-[9px] text-[var(--text-muted)]">
                    <span>Oil: <span className="text-[var(--text)]">{cp.oilPct}</span></span>
                    <span>LNG: <span className="text-[var(--text)]">{cp.lngPct}</span></span>
                    <span className="text-[var(--text-muted)]">{cp.traffic}</span>
                  </div>
                  <p className="font-mono text-[9px] leading-relaxed text-[var(--text-muted)]">
                    {liveItem?.riskDriver ?? cp.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Pipeline Status ────────────────────────────────────── */}
      {isPipeline && matchedPipelines.length > 0 && (
        <div className="bg-[var(--surface)]">
          <SectionHeader label="Pipeline Status" />
          <div className="divide-y divide-[var(--border)]">
            {matchedPipelines.map(pipe => {
              const sColor = PIPELINE_STATUS_COLOR[pipe.status] ?? '#64748b'
              return (
                <div key={pipe.name} className="flex items-center gap-3 px-4 py-2.5">
                  {/* Colored line indicator */}
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="block h-px w-6 rounded" style={{ background: pipe.color, opacity: 0.9 }} />
                    <span className="block h-px w-1.5 rounded" style={{ background: pipe.color, opacity: 0.5 }} />
                    <span className="block h-px w-1 rounded" style={{ background: pipe.color, opacity: 0.3 }} />
                  </div>
                  <span className="flex-1 font-mono text-[11px] font-bold text-[var(--text)]">{pipe.name}</span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">{pipe.capacity}</span>
                  <span
                    className="shrink-0 rounded-sm px-1.5 py-px font-mono text-[8px] font-bold uppercase"
                    style={{ background: `${sColor}18`, color: sColor, border: `1px solid ${sColor}33` }}
                  >
                    {pipe.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
