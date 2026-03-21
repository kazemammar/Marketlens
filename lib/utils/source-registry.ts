export type SourceTier = 1 | 2 | 3 | 4
export type SourceType = 'wire' | 'gov' | 'intel' | 'mainstream' | 'market' | 'tech' | 'crypto' | 'energy' | 'defense' | 'other'

export interface SourceMeta {
  tier:       SourceTier
  type:       SourceType
  stateMedia?: {
    level: 'high' | 'medium'
    state: string  // e.g. "Qatar", "China"
  }
}

// Keyed by RSS feed name (as used in RSS_FEEDS[].name and article.source)
export const SOURCE_REGISTRY: Record<string, SourceMeta> = {
  // ── Tier 1: Wire services & official government ──
  'Reuters Business':    { tier: 1, type: 'wire' },
  'Reuters World':       { tier: 1, type: 'wire' },
  'AP News':             { tier: 1, type: 'wire' },
  'Fed Reserve':         { tier: 1, type: 'gov'  },
  'ECB':                 { tier: 1, type: 'gov'  },

  // ── Tier 2: Major outlets ──
  'BBC World':           { tier: 2, type: 'mainstream' },
  'BBC Business':        { tier: 2, type: 'mainstream' },
  'CNBC Top News':       { tier: 2, type: 'market' },
  'CNBC World Markets':  { tier: 2, type: 'market' },
  'CNBC Economy':        { tier: 2, type: 'market' },
  'CNBC Tech':           { tier: 2, type: 'market' },
  'CNBC Finance':        { tier: 2, type: 'market' },
  'MarketWatch':         { tier: 2, type: 'market' },
  'NPR World':           { tier: 2, type: 'mainstream' },
  'NPR Business':        { tier: 2, type: 'mainstream' },
  'France 24':           { tier: 2, type: 'mainstream' },
  'DW News':             { tier: 2, type: 'mainstream' },
  'Nikkei Asia':         { tier: 2, type: 'mainstream' },
  'South China Morning Post': { tier: 2, type: 'mainstream' },
  'STAT News':           { tier: 2, type: 'mainstream' },

  // State media — editorially independent but government-funded
  'Al Jazeera':          { tier: 2, type: 'mainstream', stateMedia: { level: 'medium', state: 'Qatar' } },

  // ── Tier 3: Domain specialists ──
  'Seeking Alpha':       { tier: 3, type: 'market'  },
  'Defense One':         { tier: 3, type: 'defense' },
  'Defense News':        { tier: 3, type: 'defense' },
  'War on the Rocks':    { tier: 3, type: 'defense' },
  'OilPrice.com':        { tier: 3, type: 'energy'  },
  'Rigzone':             { tier: 3, type: 'energy'  },
  'Mining.com':          { tier: 3, type: 'energy'  },
  'CoinDesk':            { tier: 3, type: 'crypto'  },
  'CoinTelegraph':       { tier: 3, type: 'crypto'  },
  'The Block':           { tier: 3, type: 'crypto'  },
  'Decrypt':             { tier: 3, type: 'crypto'  },
  'FreightWaves':        { tier: 3, type: 'other'   },
  'Supply Chain Dive':   { tier: 3, type: 'other'   },
  'Carbon Brief':        { tier: 3, type: 'other'   },
  'CleanTechnica':       { tier: 3, type: 'other'   },
  'HousingWire':         { tier: 3, type: 'other'   },
  'Fierce Pharma':       { tier: 3, type: 'other'   },
  'IMF Blog':            { tier: 3, type: 'gov'     },
  'World Bank':          { tier: 3, type: 'gov'     },

  // ── Tier 4: Aggregators & tech press ──
  'Yahoo Finance':       { tier: 4, type: 'market' },
  'Benzinga':            { tier: 4, type: 'market' },
  'Investopedia':        { tier: 4, type: 'market' },
  'TechCrunch':          { tier: 4, type: 'tech'   },
  'The Verge':           { tier: 4, type: 'tech'   },
  'Ars Technica':        { tier: 4, type: 'tech'   },
  'Wired Business':      { tier: 4, type: 'tech'   },
  'Electrek':            { tier: 4, type: 'tech'   },
  'InsideEVs':           { tier: 4, type: 'tech'   },
}

export function getSourceMeta(sourceName: string): SourceMeta {
  return SOURCE_REGISTRY[sourceName] ?? { tier: 4, type: 'other' }
}
