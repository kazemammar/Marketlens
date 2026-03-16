export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/api/finnhub'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  try {
    const quote = await getQuote(symbol)
    if (!quote) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(quote)
  } catch (err) {
    console.error('[api/quote]', err)
    return NextResponse.json(null, { status: 500 })
  }
}
