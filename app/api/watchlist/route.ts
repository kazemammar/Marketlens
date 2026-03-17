import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const VALID_TYPES = ['stock', 'crypto', 'forex', 'commodity', 'etf']

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const symbol     = typeof body.symbol     === 'string' ? body.symbol.trim().toUpperCase()     : ''
  const asset_type = typeof body.asset_type === 'string' ? body.asset_type.trim().toLowerCase() : ''

  if (!symbol || symbol.length > 20 || !/^[A-Z0-9/.\-=!]+$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  if (!VALID_TYPES.includes(asset_type)) {
    return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: user.id, symbol, asset_type })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body   = await req.json()
  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : ''

  if (!symbol || symbol.length > 20) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', user.id)
    .eq('symbol', symbol)

  if (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
