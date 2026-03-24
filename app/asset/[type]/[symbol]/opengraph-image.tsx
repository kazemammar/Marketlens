import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt     = 'MarketLens Asset'
export const size    = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({
  params,
}: {
  params: Promise<{ type: string; symbol: string }>
}) {
  const { type, symbol } = await params
  const displayType = type.charAt(0).toUpperCase() + type.slice(1)

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #09090b 100%)',
          fontFamily: 'monospace',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
          }}
        />

        {/* Symbol */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: '96px',
              fontWeight: 'bold',
              color: '#fafafa',
              letterSpacing: '-2px',
            }}
          >
            {decodeURIComponent(symbol).toUpperCase()}
          </span>
        </div>

        {/* Type badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <span style={{ fontSize: '20px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '3px' }}>
            {displayType}
          </span>
        </div>

        {/* MarketLens branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            MarketLens
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
