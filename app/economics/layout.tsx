import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Economics',
  description: 'Economic indicators, GDP, inflation, interest rates, and macroeconomic data across major economies.',
}

export default function EconomicsLayout({ children }: { children: React.ReactNode }) {
  return children
}
