import Parser from 'rss-parser'
import { cachedFetch, cacheKey } from '@/lib/cache/redis'
import { TTL, RSS_FEEDS } from '@/lib/utils/constants'
import { NewsArticle } from '@/lib/utils/types'

// ─── Extended RSS item types ──────────────────────────────────────────────

type CustomFeed = Record<string, never>

type CustomItem = {
  'media:content'?:   { $?: { url?: string; medium?: string } }
  'media:thumbnail'?: { $?: { url?: string } }
  'media:group'?:     { 'media:thumbnail'?: Array<{ $?: { url?: string } }> }
  enclosure?:         { url?: string; type?: string; length?: string } | string
  'itunes:image'?:    { $?: { href?: string } } | string
}

const parser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: [
      ['media:content',   'media:content'],
      ['media:thumbnail', 'media:thumbnail'],
      ['media:group',     'media:group'],
      ['enclosure',       'enclosure'],
      ['itunes:image',    'itunes:image'],
    ],
  },
  timeout: 9_000,
})

// ─── Image extraction ─────────────────────────────────────────────────────

const isValidImage = (url: string) =>
  url.startsWith('https://') && !url.includes('yimg.com/rz/stage')

function extractImage(item: Parser.Item & CustomItem): string | undefined {
  // 1. media:content url (most common for news sites)
  const mc = item['media:content']?.['$']?.url
  if (mc && isValidImage(mc)) return mc

  // 2. media:thumbnail (BBC, Reuters)
  const mt = item['media:thumbnail']?.['$']?.url
  if (mt && isValidImage(mt)) return mt

  // 3. media:group > media:thumbnail[0]
  const mg = item['media:group']?.['media:thumbnail']?.[0]?.['$']?.url
  if (mg && isValidImage(mg)) return mg

  // 4. enclosure (can be object or string)
  const enc = item.enclosure
  if (enc) {
    const url = typeof enc === 'string' ? enc : enc.url
    if (url && isValidImage(url) && !url.endsWith('.mp3') && !url.endsWith('.mp4')) return url
  }

  // 5. itunes:image
  const ii = item['itunes:image']
  if (ii) {
    const url = typeof ii === 'string' ? ii : ii?.['$']?.href
    if (url && isValidImage(url)) return url
  }

  // 6. Scan content for first <img> src (https only)
  const content = (item as Record<string, string>).content ?? ''
  const imgMatch = content.match(/<img[^>]+src=["'](https:\/\/[^"']+)["']/i)
  if (imgMatch?.[1]) return imgMatch[1]

  return undefined
}

// ─── Feed fetcher ─────────────────────────────────────────────────────────

async function fetchFeed(feedUrl: string, feedName: string): Promise<NewsArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(9_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarketLens/1.0; +https://marketlens.vercel.app)',
        'Accept':     'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    if (!res.ok) return []
    const xml  = await res.text()
    const feed = await parser.parseString(xml)

    return (feed.items ?? []).slice(0, 20).map((item): NewsArticle => {
      const imageUrl    = extractImage(item)
      const pubDate     = item.pubDate ?? item.isoDate
      const publishedAt = pubDate ? new Date(pubDate).getTime() : Date.now()

      return {
        id:          item.guid ?? item.link ?? `${feedName}-${publishedAt}`,
        headline:    item.title?.trim() ?? 'No title',
        summary:     item.contentSnippet?.trim() ?? item.content?.trim() ?? '',
        source:      feedName,
        url:         item.link ?? '',
        imageUrl:    imageUrl,
        publishedAt,
      }
    })
  } catch {
    // Non-fatal: one bad feed shouldn't block the rest
    return []
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getFinanceNews(): Promise<NewsArticle[]> {
  return cachedFetch(
    cacheKey.rss(),
    TTL.RSS,
    async () => {
      const results = await Promise.allSettled(
        RSS_FEEDS.map((feed) => fetchFeed(feed.url, feed.name)),
      )

      const articles = results.flatMap((r) =>
        r.status === 'fulfilled' ? r.value : [],
      )

      const seen = new Set<string>()
      return articles
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .filter((a) => {
          if (!a.url || seen.has(a.url)) return false
          seen.add(a.url)
          return true
        })
    },
  )
}

export async function getNewsForSymbol(symbol: string): Promise<NewsArticle[]> {
  const all  = await getFinanceNews()
  const term = symbol.toLowerCase()

  return all.filter(
    (a) =>
      a.headline.toLowerCase().includes(term) ||
      a.summary.toLowerCase().includes(term) ||
      (a.relatedSymbols ?? []).some((s) => s.toLowerCase() === term),
  )
}
