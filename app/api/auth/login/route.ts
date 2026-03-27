import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { noCacheHeaders } from '@/lib/utils/cache-headers'


const NO_CACHE = noCacheHeaders()
export async function POST(req: Request) {
  const limited = withRateLimit(req, 10) // 10 login attempts per minute per IP
  if (limited) return limited

  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: NO_CACHE })
  }

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 400, headers: NO_CACHE })
  }

  return NextResponse.json({ user: data.user }, { headers: NO_CACHE })
}
