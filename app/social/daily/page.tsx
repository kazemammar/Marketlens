import type { Metadata } from 'next'
import DailyBriefRenderer from '@/components/social/DailyBriefRenderer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Daily Brief — MarketLens',
  robots: 'noindex, nofollow',
}

export default function DailyBriefPage() {
  return <DailyBriefRenderer />
}
