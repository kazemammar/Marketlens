interface LogoMarkProps {
  size?: number
  color?: string
  className?: string
}

export function LogoMark({ size = 28, color = '#22c55e', className = '' }: LogoMarkProps) {
  const height = size * (48 / 56)
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 56 48"
      fill={color}
      className={className}
      aria-label="MarketLens logo"
    >
      <path d="M28,0 L56,14 L28,28 L0,14 Z" />
      <path
        d="M0,22 L28,36 L56,22"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M0,32 L28,46 L56,32"
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  )
}
