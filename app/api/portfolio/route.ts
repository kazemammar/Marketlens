import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/utils/rate-limit'

const VALID_TYPES      = ['stock', 'crypto', 'commodity', 'forex', 'etf']
const VALID_DIRECTIONS = ['long', 'short']
const SYMBOL_RE        = /^[A-Z0-9/.\-=!]+$/

export async function GET(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('portfolio_positions')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body      = await req.json()
  const symbol    = typeof body.symbol     === 'string' ? body.symbol.trim().toUpperCase()     : ''
  const assetType = typeof body.asset_type === 'string' ? body.asset_type.trim().toLowerCase() : ''
  const direction = typeof body.direction  === 'string' ? body.direction.trim().toLowerCase()  : ''

  if (!symbol || symbol.length > 20 || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(assetType)) {
    return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 })
  }
  if (!VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
  }

  const quantity = body.quantity != null ? Number(body.quantity) : null
  if (quantity !== null && (isNaN(quantity) || quantity <= 0)) {
    return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 })
  }

  const avgCost = body.avg_cost != null ? Number(body.avg_cost) : null
  if (avgCost !== null && (isNaN(avgCost) || avgCost < 0)) {
    return NextResponse.json({ error: 'avg_cost must be >= 0' }, { status: 400 })
  }

  const notes = body.notes != null ? String(body.notes).trim() : null
  if (notes !== null && notes.length > 200) {
    return NextResponse.json({ error: 'notes max 200 chars' }, { status: 400 })
  }

  // Validate lots if provided
  const lots = Array.isArray(body.lots) ? body.lots : []
  const purchaseDate = body.purchase_date != null ? String(body.purchase_date).trim() : null

  const { data, error } = await supabase
    .from('portfolio_positions')
    .insert({
      user_id:       user.id,
      symbol,
      asset_type:    assetType,
      direction,
      quantity,
      avg_cost:      avgCost,
      notes,
      lots,
      purchase_date: purchaseDate,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Position already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PUT(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const id   = typeof body.id === 'string' ? body.id.trim() : ''

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.direction != null) {
    const direction = String(body.direction).trim().toLowerCase()
    if (!VALID_DIRECTIONS.includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
    }
    updates.direction = direction
  }

  if (body.quantity != null) {
    const quantity = Number(body.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be > 0' }, { status: 400 })
    }
    updates.quantity = quantity
  }

  if (body.avg_cost != null) {
    const avgCost = Number(body.avg_cost)
    if (isNaN(avgCost) || avgCost < 0) {
      return NextResponse.json({ error: 'avg_cost must be >= 0' }, { status: 400 })
    }
    updates.avg_cost = avgCost
  }

  if (body.notes != null) {
    const notes = String(body.notes).trim()
    if (notes.length > 200) {
      return NextResponse.json({ error: 'notes max 200 chars' }, { status: 400 })
    }
    updates.notes = notes
  }

  if (body.lots != null) {
    updates.lots = Array.isArray(body.lots) ? body.lots : []
  }

  if (body.purchase_date !== undefined) {
    updates.purchase_date = body.purchase_date != null ? String(body.purchase_date).trim() : null
  }

  const { data, error } = await supabase
    .from('portfolio_positions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const id   = typeof body.id === 'string' ? body.id.trim() : ''

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('portfolio_positions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
