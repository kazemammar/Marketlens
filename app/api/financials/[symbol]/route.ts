import { NextResponse } from 'next/server'
import { getFinancials } from '@/lib/api/fmp'
import { getFinancialMetrics, getEarnings } from '@/lib/api/finnhub'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params

  try {
    const [financials, metrics, earnings] = await Promise.allSettled([
      getFinancials(symbol, 'quarter'),
      getFinancialMetrics(symbol),
      getEarnings(symbol),
    ])

    return NextResponse.json({
      financials: financials.status === 'fulfilled' ? financials.value : null,
      metrics:    metrics.status    === 'fulfilled' ? metrics.value    : null,
      earnings:   earnings.status   === 'fulfilled' ? earnings.value   : [],
    })
  } catch (err) {
    console.error(`[api/financials/${symbol}]`, err)
    return NextResponse.json({ financials: null, metrics: null, earnings: [] })
  }
}
