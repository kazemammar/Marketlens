'use client'

import { useState } from 'react'

// Source abbreviation brands — purely local, no external requests
const SOURCE_BRANDS: Record<string, { abbr: string; bg: string; text?: string }> = {
  'yahoo':          { abbr: 'YF',  bg: '#7B1FA2' },
  'seeking alpha':  { abbr: 'SA',  bg: '#1B5E20' },
  'cnbc':           { abbr: 'CN',  bg: '#1565C0' },
  'reuters':        { abbr: 'RT',  bg: '#FF6F00' },
  'marketwatch':    { abbr: 'MW',  bg: '#00695C' },
  'benzinga':       { abbr: 'BZ',  bg: '#0097A7' },
  'investopedia':   { abbr: 'IP',  bg: '#1A237E' },
  'bbc':            { abbr: 'BBC', bg: '#B71C1C' },
  'al jazeera':     { abbr: 'AJ',  bg: '#E65100' },
  'bloomberg':      { abbr: 'BB',  bg: '#1A1A1A' },
  'financial times':{ abbr: 'FT',  bg: '#E8C4A0', text: '#1A1A1A' },
  'motley fool':    { abbr: 'MF',  bg: '#1565C0' },
  'the motley':     { abbr: 'MF',  bg: '#1565C0' },
  'fool':           { abbr: 'MF',  bg: '#1565C0' },
  'barrons':        { abbr: 'BR',  bg: '#004D40' },
  'oilprice':       { abbr: 'OP',  bg: '#E65100' },
  'wall street':    { abbr: 'WSJ', bg: '#111111' },
  'investor':       { abbr: 'IV',  bg: '#283593' },
  'zacks':          { abbr: 'ZK',  bg: '#0D47A1' },
}

const FALLBACK_COLORS = [
  '#6A1B9A','#1565C0','#2E7D32','#E65100',
  '#00838F','#AD1457','#4527A0','#00695C',
]

function getSourceBrand(source: string): { abbr: string; bg: string; text: string } {
  const lower = source.toLowerCase()
  for (const [key, brand] of Object.entries(SOURCE_BRANDS)) {
    if (lower.includes(key)) return { text: '#ffffff', ...brand }
  }
  const abbr = source.trim().substring(0, 2).toUpperCase() || '??'
  const idx  = ((source.charCodeAt(0) || 0) + (source.charCodeAt(1) || 0)) % FALLBACK_COLORS.length
  return { abbr, bg: FALLBACK_COLORS[idx], text: '#ffffff' }
}

// Treat these as "no image" even if the URL is technically valid
const BAD_IMAGE_PATTERNS = ['yimg.com/rz/stage', 'yahoo_finance_en-US', 's.yimg.com/uu/api/res']

function isBadImage(url: string): boolean {
  return BAD_IMAGE_PATTERNS.some((p) => url.includes(p))
}

interface NewsThumbProps {
  src?:      string
  headline?: string
  source?:   string
  size?:     'sm' | 'md'   // sm=40px, md=48px
}

export default function NewsThumb({ src, headline = '', source = '', size = 'md' }: NewsThumbProps) {
  const [failed, setFailed] = useState(false)

  const sizeClass   = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'
  const showFallback = !src || failed || isBadImage(src)

  if (showFallback) {
    const brand = getSourceBrand(source)
    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded`}
        style={{ backgroundColor: brand.bg }}
      >
        <span
          className="font-mono font-bold"
          style={{
            color:         brand.text,
            fontSize:      brand.abbr.length > 2 ? '9px' : '11px',
            letterSpacing: '0.05em',
          }}
        >
          {brand.abbr}
        </span>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={headline || 'Article thumbnail'}
      className={`${sizeClass} shrink-0 rounded object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
