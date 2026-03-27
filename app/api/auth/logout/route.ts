import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { noCacheHeaders } from '@/lib/utils/cache-headers'


const NO_CACHE = noCacheHeaders()
export async function POST(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  return NextResponse.json({ success: true }, { headers: NO_CACHE })
}
