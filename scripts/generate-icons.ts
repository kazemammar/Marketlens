import sharp from 'sharp'
import { mkdirSync } from 'fs'
import path from 'path'

mkdirSync(path.join(process.cwd(), 'public/icons'), { recursive: true })

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark background with rounded corners -->
  <rect width="512" height="512" rx="96" fill="#09090b"/>
  <!-- Subtle green inner glow square -->
  <rect x="56" y="56" width="400" height="400" rx="80" fill="#10b981" opacity="0.1" stroke="#10b981" stroke-width="2" stroke-opacity="0.25"/>
  <!-- Area fill under chart line -->
  <polygon
    points="120,370 120,340 200,260 275,288 355,185 395,162 395,370"
    fill="#10b981" opacity="0.07"
  />
  <!-- Chart line -->
  <polyline
    points="120,340 200,260 275,288 355,185 395,162"
    fill="none" stroke="#10b981" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"
  />
  <!-- Dot at latest price point -->
  <circle cx="395" cy="162" r="18" fill="#10b981"/>
  <circle cx="395" cy="162" r="10" fill="#09090b"/>
  <circle cx="395" cy="162" r="5"  fill="#10b981"/>
</svg>`

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generate() {
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(process.cwd(), `public/icons/icon-${size}x${size}.png`))
    console.log(`✓ icon-${size}x${size}.png`)
  }
}

generate().catch(console.error)
