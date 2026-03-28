import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const publicDir = path.join(process.cwd(), 'public')

// ── SVG sources ──────────────────────────────────────────────────────────────

// Simplified 2-layer mark for small sizes (16-32px)
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48" fill="#22c55e">
  <path d="M28,0 L56,14 L28,28 L0,14 Z"/>
  <path d="M0,24 L28,38 L56,24" fill="none" stroke="#22c55e" stroke-width="5.5" stroke-linejoin="round"/>
</svg>`

// Full 3-layer mark for 48px+
const svgFull = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48" fill="#22c55e">
  <path d="M28,0 L56,14 L28,28 L0,14 Z"/>
  <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linejoin="round" opacity="0.4"/>
</svg>`

// App icon: mark centered on dark background
const appIcon = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0e17"/>
  <svg x="${size * 0.18}" y="${size * 0.22}" width="${size * 0.64}" height="${size * 0.56}" viewBox="0 0 56 48" fill="#22c55e">
    <path d="M28,0 L56,14 L28,28 L0,14 Z"/>
    <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" stroke-width="${size < 64 ? '4.5' : '3.5'}" stroke-linejoin="round"/>
    <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" stroke-width="${size < 64 ? '4.5' : '3.5'}" stroke-linejoin="round" opacity="0.4"/>
  </svg>
</svg>`

// ── OG image 1200×630 ───────────────────────────────────────────────────────

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17"/>
      <stop offset="100%" stop-color="#0d1117"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid -->
  <g opacity="0.04" stroke="#22c55e" stroke-width="1">
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

  <!-- Left accent bar -->
  <rect x="0" y="0" width="4" height="630" fill="#22c55e" opacity="0.7"/>

  <!-- Diamond mark centered -->
  <svg x="500" y="140" width="200" height="172" viewBox="0 0 56 48" fill="#22c55e">
    <path d="M28,0 L56,14 L28,28 L0,14 Z"/>
    <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linejoin="round" opacity="0.4"/>
  </svg>

  <!-- MarketLens wordmark -->
  <text x="600" y="390" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="64" font-weight="800" fill="#e5e7eb" letter-spacing="-2">MarketLens</text>

  <!-- LIVE badge -->
  <circle cx="520" cy="422" r="4" fill="#22c55e"/>
  <text x="534" y="428" font-family="-apple-system, system-ui, sans-serif"
    font-size="14" font-weight="700" fill="#22c55e" letter-spacing="3">LIVE</text>

  <!-- Tagline -->
  <text x="600" y="480" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="18" fill="#6b7280" letter-spacing="4">REAL-TIME MARKET INTELLIGENCE</text>

  <!-- Domain -->
  <text x="600" y="560" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    font-size="14" fill="#3f3f46" letter-spacing="2">marketlens.live</text>

  <!-- Bottom accent bar -->
  <rect x="0" y="618" width="1200" height="12" fill="#22c55e" opacity="0.5"/>
</svg>`

// ── Generate all assets ──────────────────────────────────────────────────────

async function run() {
  // Favicon PNGs (transparent bg, simplified for small sizes)
  for (const size of [16, 32]) {
    await sharp(Buffer.from(svgFavicon))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, `favicon-${size}x${size}.png`))
    console.log(`✓ public/favicon-${size}x${size}.png`)
  }

  // Larger favicon (full 3-layer)
  await sharp(Buffer.from(svgFull))
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-48x48.png'))
  console.log('✓ public/favicon-48x48.png')

  // Apple touch icon (180x180, dark bg with mark centered)
  await sharp(Buffer.from(appIcon(180)))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ public/apple-touch-icon.png')

  // Android/PWA icons for manifest
  for (const size of [192, 512]) {
    await sharp(Buffer.from(appIcon(size)))
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}x${size}.png`))
    console.log(`✓ public/icon-${size}x${size}.png`)
  }

  // OG image
  await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, 'og-image.png'))
  console.log('✓ public/og-image.png')

  // Copy SVG favicon to public root
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon)
  console.log('✓ public/favicon.svg')

  console.log('\nAll favicons and icons generated!')
}

run().catch(console.error)
