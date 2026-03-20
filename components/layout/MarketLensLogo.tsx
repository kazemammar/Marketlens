// MarketLensLogo — Complete logo component
// Drop this into your codebase and use <MarketLensLogo /> in the navbar

import React from 'react';

interface MarketLensLogoProps {
  /** Icon size in pixels — wordmark scales proportionally */
  size?: number;
  /** Show wordmark text or icon only (useful for mobile) */
  showWordmark?: boolean;
  /** Optional className for the wrapper */
  className?: string;
  /** Link href — defaults to "/" */
  href?: string;
}

const MarketLensLogo: React.FC<MarketLensLogoProps> = ({
  size = 36,
  showWordmark = true,
  className = '',
  href = '/',
}) => {
  // Scale all wordmark dimensions relative to the icon size
  const fontSize = size * 0.53;
  const subFontSize = size * 0.18;
  const dotSize = size * 0.1;
  const gap = size * 0.25;

  return (
    <a
      href={href}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: gap,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {/* ─── ICON ─── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Glow filter for the chart line */}
          <filter id="mlLogoGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Blur filter for the area fill — makes all edges soft */}
          <filter id="mlLogoAreaBlur" x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* Rounded rectangle frame */}
        <rect
          x="5" y="5" width="90" height="90" rx="18"
          stroke="#00FF88" strokeWidth="2" fill="none" opacity="0.2"
        />

        {/* Baseline */}
        <line
          x1="14" y1="78" x2="86" y2="78"
          stroke="#00FF88" strokeWidth="1" opacity="0.1"
        />

        {/* Area fill — blurred polygon, all edges feathered */}
        <polygon
          points="14,68 28,52 40,58 54,28 66,38 78,18 86,24 86,78 14,78"
          fill="#00FF88"
          opacity="0.12"
          filter="url(#mlLogoAreaBlur)"
        />

        {/* Chart line */}
        <polyline
          points="14,68 28,52 40,58 54,28 66,38 78,18 86,24"
          stroke="#00FF88"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="none"
          filter="url(#mlLogoGlow)"
        />
      </svg>

      {/* ─── WORDMARK ─── */}
      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          {/* MarketLens text */}
          <span
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: fontSize,
              fontWeight: 700,
              color: '#F0F0F5',
              letterSpacing: '-0.3px',
              whiteSpace: 'nowrap',
            }}
          >
            Market
            <span style={{ color: '#00FF88', fontWeight: 800 }}>Lens</span>
          </span>

          {/* LIVE indicator with pulsating dot */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: dotSize * 0.6,
              marginTop: size * 0.05,
            }}
          >
            {/* Pulsating green dot */}
            <span
              style={{
                position: 'relative',
                display: 'inline-block',
                width: dotSize,
                height: dotSize,
              }}
            >
              {/* Ping animation ring */}
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#00FF88',
                  opacity: 0.4,
                  animation: 'mlLogoPulse 2s ease-in-out infinite',
                }}
              />
              {/* Solid dot */}
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: '#00FF88',
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

      {/* Keyframe animation for the pulsating dot */}
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
  );
};

export default MarketLensLogo;
