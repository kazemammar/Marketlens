import React from 'react'

interface MarketLensLogoProps {
  /** Icon size in pixels — wordmark scales proportionally */
  size?: number
  /** Show wordmark text or icon only (useful for mobile) */
  showWordmark?: boolean
  /** Optional className for the wrapper */
  className?: string
  /** Link href — defaults to "/" */
  href?: string
}

const MarketLensLogo: React.FC<MarketLensLogoProps> = ({
  size = 36,
  showWordmark = true,
  className = '',
  href = '/',
}) => {
  const fontSize = size * 0.53
  const subFontSize = size * 0.18
  const dotSize = size * 0.1
  const gap = size * 0.25
  const markHeight = size * (48 / 56)

  return (
    <a
      href={href}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* ─── ICON ─── */}
      <svg
        width={size}
        height={markHeight}
        viewBox="0 0 56 48"
        fill="#22c55e"
        aria-label="MarketLens logo"
      >
        <path d="M28,0 L56,14 L28,28 L0,14 Z" />
        <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" opacity="0.4" />
      </svg>

      {/* ─── WORDMARK ─── */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize,
              fontWeight: 700,
              color: '#F0F0F5',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
            }}
          >
            MarketLens
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: dotSize * 0.6,
              marginTop: size * 0.05,
            }}
          >
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                width: dotSize,
                height: dotSize,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  opacity: 0.4,
                  animation: 'mlLogoPulse 2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  opacity: 0.7,
                }}
              />
            </span>

            <span
              style={{
                fontFamily: "var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: subFontSize,
                fontWeight: 400,
                color: '#C8C8D0',
                letterSpacing: '0.8px',
                opacity: 0.5,
              }}
            >
              LIVE
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes mlLogoPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }
          50% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </a>
  )
}

export default MarketLensLogo
