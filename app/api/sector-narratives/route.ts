import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { getClient } from '@/lib/api/groq'
import { redis } from '@/lib/cache/redis'
import { STOCK_SECTORS } from '@/lib/utils/sectors'
import { withRateLimit } from '@/lib/utils/rate-limit'

const CACHE_KEY = 'sector-narratives:v1'
const CACHE_TTL = 1800 // 30 min

interface SectorNarratives {
  narratives: Record<string, string>
  generatedAt: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 10)
  if (limited) return limited

  // Check cache first
  try {
    const cached = await redis.get<SectorNarratives>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const articles = await getFinanceNews()
    const sectorNames = Object.keys(STOCK_SECTORS)

    // For each sector, find headlines containing any ticker from that sector
    const sectorHeadlines: Record<string, string[]> = {}

    for (const sector of sectorNames) {
      const tickers = STOCK_SECTORS[sector]
      const matched: string[] = []

      for (const article of articles) {
        if (matched.length >= 3) break
        const text = article.headline.toUpperCase()
        const hasMatch = tickers.some((ticker) => {
          // Match ticker as a whole word (bounded by non-alpha chars or string edges)
          const re = new RegExp(`\\b${ticker.replace('.', '\\.')}\\b`, 'i')
          return re.test(text)
        })
        if (hasMatch) {
          matched.push(article.headline)
        }
      }

      if (matched.length > 0) {
        sectorHeadlines[sector] = matched
      }
    }

    // If no sectors matched any headlines, return empty
    const matchedSectors = Object.keys(sectorHeadlines)
    if (matchedSectors.length === 0) {
      const result: SectorNarratives = { narratives: {}, generatedAt: Date.now() }
      redis.set(CACHE_KEY, result, { ex: CACHE_TTL }).catch(() => {})
      return NextResponse.json(result)
    }

    // Build the user message for Groq
    const userMessage = matchedSectors
      .map((sector) => `${sector}: ${sectorHeadlines[sector].join(' | ')}`)
      .join('\n')

    const client = getClient()
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'For each sector below, write ONE punchy sentence (max 15 words) explaining what\'s driving it today. Respond with valid JSON: { "Technology": "...", ... }. Only include sectors that have headlines. Be specific \u2014 name companies or events.',
        },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: Record<string, string>
    try { parsed = JSON.parse(raw) } catch { parsed = {} }

    // Validate: only keep string values for known sectors
    const narratives: Record<string, string> = {}
    for (const [sector, text] of Object.entries(parsed)) {
      if (typeof text === 'string' && sectorNames.includes(sector)) {
        narratives[sector] = text
      }
    }

    const result: SectorNarratives = { narratives, generatedAt: Date.now() }
    redis.set(CACHE_KEY, result, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(result)
  } catch (err) {
    console.error('[sector-narratives]', err)
    return NextResponse.json({ narratives: {}, generatedAt: Date.now() })
  }
}
