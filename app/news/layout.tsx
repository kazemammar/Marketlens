import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'News',
  description: 'Latest financial news, market updates, and breaking stories across stocks, crypto, forex, and commodities.',
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
