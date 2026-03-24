import { NextRequest, NextResponse } from 'next/server'
import { getSocialSentiment } from '@/lib/api/finnhub'

const SYMBOL_RE = /^[A-Z0-9.=\-]{1,12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  try {
    const data = await getSocialSentiment(symbol.toUpperCase())
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ reddit: [], twitter: [] })
  }
}
