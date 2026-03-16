import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/api/finnhub'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params

  try {
    const data = await getRecommendations(symbol)
    return NextResponse.json(data)
  } catch (err) {
    console.error(`[api/recommendations/${symbol}]`, err)
    return NextResponse.json([])
  }
}
