interface LogoFullProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'dark' | 'light' | 'green'
  className?: string
}

export function LogoFull({ size = 'md', variant = 'green', className = '' }: LogoFullProps) {
  const sizes = {
    sm: { mark: 22, text: 'text-sm', live: 'text-[6px]', gap: 'gap-1.5' },
    md: { mark: 28, text: 'text-lg', live: 'text-[7px]', gap: 'gap-2' },
    lg: { mark: 36, text: 'text-2xl', live: 'text-[8px]', gap: 'gap-3' },
  }

  const colors = {
    green: { mark: '#22c55e', text: '', live: 'text-green-500' },
    dark:  { mark: '#0a0a0a', text: 'text-gray-900', live: 'text-green-500' },
    light: { mark: '#e5e7eb', text: 'text-gray-200', live: 'text-green-500' },
  }

  const s = sizes[size]
  const c = colors[variant]
  const markHeight = s.mark * (48 / 56)

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      <svg
        width={s.mark}
        height={markHeight}
        viewBox="0 0 56 48"
        fill={c.mark}
        aria-label="MarketLens logo"
      >
        <path d="M28,0 L56,14 L28,28 L0,14 Z" />
        <path d="M0,22 L28,36 L56,22" fill="none" stroke={c.mark} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M0,32 L28,46 L56,32" fill="none" stroke={c.mark} strokeWidth="3.5" strokeLinejoin="round" opacity="0.4" />
      </svg>
      <div className="flex flex-col">
        <span className={`font-bold tracking-tight leading-none ${s.text} ${c.text}`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
          MarketLens
        </span>
        <span className={`font-bold tracking-[0.15em] leading-none ${s.live} ${c.live} flex items-center gap-1`}>
          <span className="relative flex h-1 w-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500" />
          </span>
          LIVE
        </span>
      </div>
    </div>
  )
}
