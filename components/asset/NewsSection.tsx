import { AssetType } from '@/lib/utils/types'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { getCompanyNews } from '@/lib/api/finnhub'
import { getNewsForSymbol } from '@/lib/api/rss'
import NewsThumb from './NewsThumb'

interface NewsSectionProps {
  symbol: string
  type:   AssetType
}

async function fetchNews(symbol: string, type: AssetType) {
  try {
    if (type === 'stock' || type === 'etf') {
      const to   = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1_000)
      const fmt  = (d: Date) => d.toISOString().slice(0, 10)
      const articles = await getCompanyNews(symbol, fmt(from), fmt(to))
      if (articles.length > 0) return articles.slice(0, 10)
    }
    return (await getNewsForSymbol(symbol)).slice(0, 10)
  } catch {
    return []
  }
}

export default async function NewsSection({ symbol, type }: NewsSectionProps) {
  const articles = await fetchNews(symbol, type)

  if (articles.length === 0) {
    return (
      <section>
        <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Latest News</h2>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">No recent news found.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        Latest News
      </h2>
      <div className="flex flex-col divide-y divide-[var(--border)] rounded border border-[var(--border)] bg-[var(--surface)]">
        {articles.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 p-3 transition hover:bg-[var(--surface-2)]"
          >
            {/* Thumbnail — always show, NewsThumb handles fallback */}
            <NewsThumb
              src={article.imageUrl}
              headline={article.headline}
              source={article.source}
              size="md"
            />

            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-[var(--text)] transition-colors group-hover:text-blue-400">
                {article.headline}
              </p>
              <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-[var(--text-muted)]">
                <span className="font-semibold">{article.source}</span>
                <span>·</span>
                <span>{formatRelativeTime(article.publishedAt)}</span>
              </div>
            </div>

            <span className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
              ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
