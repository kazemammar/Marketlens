import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { noCacheHeaders } from '@/lib/utils/cache-headers'


const NO_CACHE = noCacheHeaders()
export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return NextResponse.json({ user }, { headers: NO_CACHE })
}
