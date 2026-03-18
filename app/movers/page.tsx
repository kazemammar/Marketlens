import type { Metadata } from 'next'
import MoversView from '@/components/pages/MoversView'

export const metadata: Metadata = {
  title:       'Top Movers',
  description: 'Biggest gainers and losers across stocks, crypto, and commodities — updated in real-time.',
}

export default function MoversPage() {
  return <MoversView />
}
