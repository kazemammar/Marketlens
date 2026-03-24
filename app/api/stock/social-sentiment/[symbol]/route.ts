import { NextRequest, NextResponse } from 'next/server'
import { getSocialSentiment } from '@/lib/api/finnhub'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  try {
    const data = await getSocialSentiment(symbol.toUpperCase())
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ reddit: [], twitter: [] })
  }
}
