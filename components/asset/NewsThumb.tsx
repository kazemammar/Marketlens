'use client'

import { useState } from 'react'

// Source-specific brand colors (checked first, case-insensitive substring match)
const SOURCE_COLOR_MAP: Array<[string, string]> = [
  ['yahoo',       'bg-violet-700'],
  ['seeking',     'bg-emerald-700'],   // SeekingAlpha
  ['cnbc',        'bg-blue-700'],
  ['oilprice',    'bg-orange-600'],
  ['reuters',     'bg-red-700'],
  ['bbc',         'bg-red-700'],
  ['al jazeera',  'bg-amber-600'],
  ['aljazeera',   'bg-amber-600'],
  ['marketwatch', 'bg-teal-700'],
  ['benzinga',    'bg-cyan-700'],
  ['investopedia','bg-blue-800'],
  ['defense',     'bg-slate-600'],
]

// Fallback palette keyed by first-char code
const PALETTE = [
  'bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600', 'bg-cyan-600',   'bg-indigo-600',  'bg-orange-600',
]

function sourceColor(source: string): string {
  const lower = source.toLowerCase()
  for (const [key, color] of SOURCE_COLOR_MAP) {
    if (lower.includes(key)) return color
  }
  const code = source.trim().toUpperCase().charCodeAt(0) || 0
  return PALETTE[code % PALETTE.length]
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

export default function NewsThumb({ src, headline: _headline = '', source = '', size = 'md' }: NewsThumbProps) {
  const [failed, setFailed] = useState(false)
  const sizeClass  = size === 'sm' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base'
  const letter     = source.trim().charAt(0).toUpperCase() || '?'
  const colorClass = sourceColor(source)

  const showFallback = !src || failed || isBadImage(src)

  if (showFallback) {
    return (
      <div className={`${sizeClass} ${colorClass} flex shrink-0 items-center justify-center rounded font-bold text-white`}>
        {letter}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`${sizeClass} shrink-0 rounded object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
