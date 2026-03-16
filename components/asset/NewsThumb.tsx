'use client'

import { useState } from 'react'

// Category icon derived from headline/source keywords
function categoryIcon(headline: string, source: string): string {
  const s = (headline + ' ' + source).toLowerCase()
  if (s.includes('bitcoin') || s.includes('crypto') || s.includes('ethereum') || s.includes('blockchain')) return '₿'
  if (s.includes('oil') || s.includes('crude') || s.includes('opec') || s.includes('energy') || s.includes('gas')) return '🛢️'
  if (s.includes('gold') || s.includes('silver') || s.includes('metal') || s.includes('commodity')) return '🥇'
  if (s.includes('forex') || s.includes('currency') || s.includes('dollar') || s.includes('euro') || s.includes('yen')) return '💱'
  if (s.includes('war') || s.includes('conflict') || s.includes('sanction') || s.includes('geopolit') || s.includes('ukraine') || s.includes('israel') || s.includes('iran')) return '🌍'
  if (s.includes('fed') || s.includes('rate') || s.includes('inflation') || s.includes('gdp') || s.includes('economy')) return '🏦'
  if (s.includes('tech') || s.includes('ai') || s.includes('nvidia') || s.includes('apple') || s.includes('microsoft')) return '💻'
  if (s.includes('defense') || s.includes('military') || s.includes('weapon') || s.includes('nato')) return '🛡️'
  return '📰'
}

interface NewsThumbProps {
  src?:      string
  headline?: string
  source?:   string
  size?:     'sm' | 'md'   // sm=40px, md=48px
}

export default function NewsThumb({ src, headline = '', source = '', size = 'md' }: NewsThumbProps) {
  const [failed, setFailed] = useState(false)
  const icon     = categoryIcon(headline, source)
  const sizeClass = size === 'sm' ? 'h-10 w-10 text-base' : 'h-12 w-12 text-lg'

  if (!src || failed) {
    return (
      <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded bg-[var(--surface-2)]`}>
        {icon}
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
