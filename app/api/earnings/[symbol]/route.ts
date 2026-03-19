import { NextResponse } from 'next/server'
import { getEarnings } from '@/lib/api/finnhub'
import { withRateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params

  try {
    const earnings = await getEarnings(decodeURIComponent(symbol))
    return NextResponse.json({ earnings, symbol })
  } catch (err) {
    console.error(`[api/earnings/${symbol}]`, err)
    return NextResponse.json({ earnings: [], symbol }, { status: 200 })
  }
}
