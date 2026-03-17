import sharp from 'sharp'
import path from 'path'

const publicDir = path.join(process.cwd(), 'public')

// ── OG image 1200×630 ────────────────────────────────────────────────────────

const ogSvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </linearGradient>
    <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid -->
  <g opacity="0.05" stroke="#10b981" stroke-width="1">
    <line x1="0" y1="126" x2="1200" y2="126"/>
    <line x1="0" y1="252" x2="1200" y2="252"/>
    <line x1="0" y1="378" x2="1200" y2="378"/>
    <line x1="0" y1="504" x2="1200" y2="504"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Chart line fill area -->
  <polygon
    points="0,630 0,460 120,430 260,400 400,420 540,360 680,310 820,270 960,210 1100,165 1200,150 1200,630"
    fill="url(#chartFill)"
  />

  <!-- Chart line -->
  <polyline
    points="0,460 120,430 260,400 400,420 540,360 680,310 820,270 960,210 1100,165 1200,150"
    fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"
  />

  <!-- Left accent bar -->
  <rect x="0" y="0" width="4" height="630" fill="#10b981" opacity="0.7"/>

  <!-- Logo icon box -->
  <rect x="526" y="148" width="148" height="148" rx="28" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.3"/>
  <!-- Chart icon inside box -->
  <polyline
    points="556,262 586,222 616,238 646,198 686,174"
    fill="none" stroke="#10b981" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
  />

  <!-- MarketLens wordmark -->
  <text x="600" y="368" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="64" font-weight="800" fill="#fafafa" letter-spacing="-2">MarketLens</text>

  <!-- Tagline -->
  <text x="600" y="414" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="19" font-weight="400" fill="#71717a" letter-spacing="5">REAL-TIME FINANCIAL INTELLIGENCE</text>

  <!-- Divider line -->
  <line x1="480" y1="450" x2="720" y2="450" stroke="#27272a" stroke-width="1"/>

  <!-- Feature list -->
  <text text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="15" fill="#52525b" letter-spacing="1">
    <tspan x="258" y="490">Stocks</tspan>
    <tspan x="334" y="490" fill="#27272a">·</tspan>
    <tspan x="408" y="490">Crypto</tspan>
    <tspan x="482" y="490" fill="#27272a">·</tspan>
    <tspan x="556" y="490">Forex</tspan>
    <tspan x="630" y="490" fill="#27272a">·</tspan>
    <tspan x="730" y="490">Commodities</tspan>
    <tspan x="832" y="490" fill="#27272a">·</tspan>
    <tspan x="900" y="490">ETFs</tspan>
  </text>

  <!-- Domain -->
  <text x="600" y="560" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="14" fill="#3f3f46" letter-spacing="2">marketlens.live</text>

  <!-- Bottom accent bar -->
  <rect x="0" y="618" width="1200" height="12" fill="#10b981" opacity="0.5"/>
</svg>`

// ── Favicon 32×32 ─────────────────────────────────────────────────────────────

const faviconSvg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#09090b"/>
  <rect width="32" height="32" rx="6" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-width="1" stroke-opacity="0.3"/>
  <polyline
    points="5,24 11,16 17,19 23,11 27,7"
    fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
  />
</svg>`

// ── Apple touch icon 180×180 ──────────────────────────────────────────────────

const appleSvg = `<svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
  <rect width="180" height="180" rx="40" fill="#09090b"/>
  <rect width="180" height="180" rx="40" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="2" stroke-opacity="0.3"/>
  <polyline
    points="28,136 62,90 96,108 130,62 152,40"
    fill="none" stroke="#10b981" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"
  />
</svg>`

async function run() {
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(publicDir, 'og-image.png'))
  console.log('✓ public/og-image.png')

  await sharp(Buffer.from(faviconSvg)).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32x32.png'))
  console.log('✓ public/favicon-32x32.png')

  await sharp(Buffer.from(appleSvg)).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ public/apple-touch-icon.png')
}

run().catch(console.error)
