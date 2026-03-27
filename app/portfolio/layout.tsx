import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Track your portfolio performance, positions, P&L, and get AI-powered insights.',
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  return children
}
