import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Monitor your watchlist with live prices, changes, and quick access to detailed asset analysis.',
}

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return children
}
