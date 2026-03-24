import { AssetType, NewsArticle } from '@/lib/utils/types'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { getCompanyNews } from '@/lib/api/finnhub'
import { getRelatedNewsForAsset } from '@/lib/api/rss'
import { categorizeArticle, CAT_BADGE, CAT_LABEL } from '@/lib/utils/news-helpers'
import { clusterArticles } from '@/lib/utils/news-clustering'
import type { NewsCluster } from '@/lib/utils/news-clustering'
import NewsThumb from './NewsThumb'

interface NewsSectionProps {
  symbol: string
  type:   AssetType
}

async function fetchNews(symbol: string, type: AssetType): Promise<NewsCluster[]> {
  try {
    let finnhubArticles: NewsArticle[] = []

    if (type === 'stock' || type === 'etf') {
      const to   = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1_000)
      const fmt  = (d: Date) => d.toISOString().slice(0, 10)
      finnhubArticles = await getCompanyNews(symbol, fmt(from), fmt(to))
    }

    // Always fetch related RSS news scored by keyword relevance
    const related = await getRelatedNewsForAsset(symbol, type)

    // Merge + dedupe by first 50 chars of headline
    const seen = new Set<string>()
    const merged = [...finnhubArticles, ...related].filter((a) => {
      const key = a.headline.toLowerCase().slice(0, 50)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    merged.sort((a, b) => b.publishedAt - a.publishedAt)
    const clusters = clusterArticles(merged)
    return clusters.slice(0, 12)
  } catch {
    return []
  }
}

export default async function NewsSection({ symbol, type }: NewsSectionProps) {
  const clusters = await fetchNews(symbol, type)

  if (clusters.length === 0) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Latest News</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        </div>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-10 text-center">
          <p className="font-mono text-[10px] text-[var(--text-muted)]">No recent news found.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Latest News
      </h2>
      <div className="flex flex-col divide-y divide-[var(--border)] rounded border border-[var(--border)] bg-[var(--surface)]">
        {clusters.map((cluster: NewsCluster) => {
          const cat = categorizeArticle(cluster.headline)
          const tc  = cluster.sourceMeta.tier === 1 ? 'var(--accent)'
                    : cluster.sourceMeta.tier === 2 ? '#3b82f6'
                    : null
          return (
            <a
              key={cluster.id}
              href={cluster.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 p-3 transition hover:bg-[var(--surface-2)]"
            >
              <NewsThumb
                src={cluster.imageUrl}
                headline={cluster.headline}
                source={cluster.source}
                size="md"
              />

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-mono text-[11px] font-medium leading-snug text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
                  {cluster.headline}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-[var(--text-muted)]">
                  {/* Tier dot */}
                  {tc && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tc }} />}

                  <span className="font-semibold">{cluster.source}</span>

                  {/* State media badge */}
                  {cluster.sourceMeta.stateMedia && (
                    <span
                      className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${
                        cluster.sourceMeta.stateMedia.level === 'high'
                          ? 'border-red-500/30 bg-red-500/15 text-red-400'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {cluster.sourceMeta.stateMedia.level === 'high' ? '⚠ STATE' : '! GOV'}
                    </span>
                  )}

                  <span>·</span>
                  <span>{formatRelativeTime(cluster.latestAt)}</span>

                  <span
                    className={`inline rounded border px-1 py-px text-[8px] font-bold uppercase ${CAT_BADGE[cat]}`}
                  >
                    {CAT_LABEL[cat]}
                  </span>

                  {/* Multi-source badge */}
                  {cluster.sourceCount > 1 && (
                    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)]">
                      +{cluster.sourceCount - 1} sources
                    </span>
                  )}
                </div>
              </div>

              <span className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
                ↗
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
