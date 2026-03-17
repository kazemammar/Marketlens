'use client'

import { useEffect, useRef } from 'react'

/**
 * Wraps children in a div that fades-up on first scroll into view.
 * Uses the .section-hidden / .section-visible CSS classes defined in globals.css.
 */
export default function SectionReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.replace('section-hidden', 'section-visible'), delay)
          obs.disconnect()
        }
      },
      { threshold: 0.08 },
    )

    el.classList.add('section-hidden')
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
