// GET /api/commodities
// Returns prices for major commodities (gold, silver, oil, natural gas, etc.)

import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest) {
  return Response.json({ todo: true })
}
