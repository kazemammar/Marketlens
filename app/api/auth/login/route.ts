import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/utils/rate-limit'

export async function POST(req: Request) {
  const limited = withRateLimit(req, 10) // 10 login attempts per minute per IP
  if (limited) return limited

  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 400 })
  }

  return NextResponse.json({ user: data.user })
}
