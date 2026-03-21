import { getFinanceNews } from '@/lib/api/rss'

// ─── Types ────────────────────────────────────────────────────────────────

export interface ChokepointData {
  id:             string
  name:           string
  lat:            number
  lng:            number
  oilFlow:        string
  lngFlow:        string
  tradeVolume:    string
  description:    string
  affectedAssets: string[]
  keywords:       string[]
  criticalWords:  string[]
}

export type ChokepointStatus = 'NORMAL' | 'ELEVATED' | 'DISRUPTED' | 'BLOCKED'

export interface ChokepointIntelItem {
  id:               string
  name:             string
  lat:              number
  lng:              number
  status:           ChokepointStatus
  oilFlow:          string
  lngFlow:          string
  tradeVolume:      string
  description:      string
  affectedAssets:   string[]
  riskDriver:       string | null
  insuranceRisk:    'NORMAL' | 'ELEVATED' | 'HIGH'
  matchedHeadlines: number
}

export interface ChokepointIntelPayload {
  chokepoints:    ChokepointIntelItem[]
  disruptedCount: number
  generatedAt:    number
}

// ─── Baseline definitions ─────────────────────────────────────────────────

const CHOKEPOINT_DEFS: ChokepointData[] = [
  {
    id: 'hormuz',
    name: 'Strait of Hormuz',
    lat: 26.6, lng: 56.2,
    oilFlow: '21M bbl/day',
    lngFlow: '17% of global LNG',
    tradeVolume: '~60 tankers/day',
    description: "World's most critical oil chokepoint. Iranian closure threat would spike Brent above $120.",
    affectedAssets: ['CL=F', 'BZ=F', 'XOM', 'CVX', 'USO'],
    keywords: ['hormuz', 'strait of hormuz', 'persian gulf block', 'iran strait', 'iran shipping', 'iran naval', 'iran navy', 'persian gulf closure', 'hormuz closure', 'iran oil'],
    criticalWords: ['hormuz closed', 'hormuz blocked', 'hormuz blockade', 'iran blocks strait'],
  },
  {
    id: 'suez',
    name: 'Suez Canal',
    lat: 30.0, lng: 32.3,
    oilFlow: '4.5M bbl/day',
    lngFlow: '8% of global LNG',
    tradeVolume: '~50 ships/day',
    description: 'Disruption adds 10-14 days via Cape of Good Hope, raising freight costs 40%.',
    affectedAssets: ['USO', 'BZ=F'],
    keywords: ['suez canal', 'suez block', 'suez disrupt', 'suez closure', 'suez stuck', 'suez grounding'],
    criticalWords: ['suez blocked', 'suez canal closed', 'suez shutdown'],
  },
  {
    id: 'malacca',
    name: 'Strait of Malacca',
    lat: 2.5, lng: 101.8,
    oilFlow: '16M bbl/day',
    lngFlow: '25% of global LNG',
    tradeVolume: '~80K vessels/year',
    description: '40% of global trade. Blockage would strangle Asia-Pacific energy supply.',
    affectedAssets: ['USO', 'CL=F'],
    keywords: ['malacca strait', 'malacca block', 'south china sea shipping', 'malacca piracy', 'malacca disruption'],
    criticalWords: ['malacca blocked', 'malacca closed', 'malacca strait blockade'],
  },
  {
    id: 'babelMandeb',
    name: 'Bab el-Mandeb',
    lat: 12.6, lng: 43.3,
    oilFlow: '6.2M bbl/day',
    lngFlow: '3% of global LNG',
    tradeVolume: '~30 ships/day',
    description: 'Houthi threats have rerouted major shipping volumes away from Red Sea.',
    affectedAssets: ['USO', 'BZ=F'],
    keywords: ['houthi', 'red sea attack', 'bab el-mandeb', 'bab-el-mandeb', 'yemen shipping', 'red sea shipping', 'houthi attack', 'red sea missile', 'red sea drone'],
    criticalWords: ['red sea closed', 'bab el-mandeb blocked', 'red sea blockade'],
  },
  {
    id: 'bosphorus',
    name: 'Turkish Straits',
    lat: 41.0, lng: 29.0,
    oilFlow: '3M bbl/day',
    lngFlow: '—',
    tradeVolume: '~50K vessels/year',
    description: 'Sole Black Sea exit. Controls Russian and Kazakh oil and Ukrainian grain exports.',
    affectedAssets: ['CL=F', 'WEAT'],
    keywords: ['bosphorus', 'turkish strait', 'black sea shipping', 'dardanelles', 'montreux convention'],
    criticalWords: ['bosphorus closed', 'turkish straits blocked'],
  },
  {
    id: 'panama',
    name: 'Panama Canal',
    lat: 9.1, lng: -79.7,
    oilFlow: '0.9M bbl/day',
    lngFlow: '11% of global LNG',
    tradeVolume: '~38 ships/day',
    description: 'Drought-reduced capacity. US LNG exports to Asia-Pacific significantly impacted.',
    affectedAssets: ['UNG'],
    keywords: ['panama canal', 'panama drought', 'panama delay', 'panama shipping', 'panama restriction'],
    criticalWords: ['panama canal closed', 'panama canal shutdown'],
  },
]

// ─── Intelligence analysis ────────────────────────────────────────────────

export async function analyzeChokepointIntel(): Promise<ChokepointIntelPayload> {
  // Fetch recent news headlines (already cached by RSS layer)
  let headlines: Array<{ headline: string; publishedAt: number }> = []
  try {
    const articles = await getFinanceNews()
    const cutoff   = Date.now() - 24 * 60 * 60 * 1000
    headlines = articles
      .filter(a => a.publishedAt > cutoff)
      .map(a => ({ headline: a.headline, publishedAt: a.publishedAt }))
  } catch { /* proceed with empty — all chokepoints will be NORMAL */ }

  const chokepoints: ChokepointIntelItem[] = CHOKEPOINT_DEFS.map(def => {
    const headlineTexts = headlines.map(h => h.headline.toLowerCase())

    let matchCount = 0
    let riskDriver: string | null = null

    for (const h of headlines) {
      const lower = h.headline.toLowerCase()
      if (def.keywords.some(kw => lower.includes(kw))) {
        matchCount++
        if (!riskDriver) riskDriver = h.headline  // first match = most recent
      }
    }

    let status: ChokepointStatus = 'NORMAL'
    const hasCritical = headlineTexts.some(t => def.criticalWords.some(kw => t.includes(kw)))

    if (hasCritical) {
      status = 'BLOCKED'
    } else if (matchCount >= 5) {
      status = 'DISRUPTED'
    } else if (matchCount >= 2) {
      status = 'ELEVATED'
    }

    const insuranceRisk: 'NORMAL' | 'ELEVATED' | 'HIGH' =
      status === 'BLOCKED'   ? 'HIGH' :
      status === 'DISRUPTED' ? 'HIGH' :
      status === 'ELEVATED'  ? 'ELEVATED' : 'NORMAL'

    return {
      id:               def.id,
      name:             def.name,
      lat:              def.lat,
      lng:              def.lng,
      status,
      oilFlow:          def.oilFlow,
      lngFlow:          def.lngFlow,
      tradeVolume:      def.tradeVolume,
      description:      def.description,
      affectedAssets:   def.affectedAssets,
      riskDriver,
      insuranceRisk,
      matchedHeadlines: matchCount,
    }
  })

  return {
    chokepoints,
    disruptedCount: chokepoints.filter(c => c.status !== 'NORMAL').length,
    generatedAt:    Date.now(),
  }
}
