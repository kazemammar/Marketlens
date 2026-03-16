import { NewsArticle, AssetType } from '@/lib/utils/types'
import { formatRelativeTime } from '@/lib/utils/formatters'
import NewsThumb from './NewsThumb'

interface NewsSectionProps {
  symbol: string
  type:   AssetType
}

async function fetchNews(symbol: string, type: AssetType): Promise<NewsArticle[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(
      `${baseUrl}/api/news/${encodeURIComponent(symbol)}?type=${type}`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function NewsSection({ symbol, type }: NewsSectionProps) {
  const articles = await fetchNews(symbol, type)

  if (articles.length === 0) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">Latest News</h2>
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-12 text-center">
          <p className="text-2xl">📭</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">No recent news found.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
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
