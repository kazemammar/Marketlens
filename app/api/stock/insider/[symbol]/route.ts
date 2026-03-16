export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getInsiderTransactions } from '@/lib/api/finnhub'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  try {
    const transactions = await getInsiderTransactions(symbol)
    return NextResponse.json(transactions)
  } catch (err) {
    console.error('[api/stock/insider]', err)
    return NextResponse.json([])
  }
}
