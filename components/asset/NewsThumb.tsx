'use client'

import { useState } from 'react'

// Deterministic color from source name — maps first char to one of 8 distinct hues
const PALETTE = [
  'bg-blue-600',   'bg-violet-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-rose-600',   'bg-cyan-600',   'bg-indigo-600',  'bg-orange-600',
]

function sourceColor(source: string): string {
  const code = (source.trim().toUpperCase().charCodeAt(0) || 0)
  return PALETTE[code % PALETTE.length]
}

interface NewsThumbProps {
  src?:      string
  headline?: string
  source?:   string
  size?:     'sm' | 'md'   // sm=40px, md=48px
}

export default function NewsThumb({ src, headline: _headline = '', source = '', size = 'md' }: NewsThumbProps) {
  const [failed, setFailed] = useState(false)
  const sizeClass  = size === 'sm' ? 'h-10 w-10 text-sm'  : 'h-12 w-12 text-base'
  const letter     = source.trim().charAt(0).toUpperCase() || '?'
  const colorClass = sourceColor(source)

  if (!src || failed) {
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
