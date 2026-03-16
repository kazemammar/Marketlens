import { createClient as _createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof _createClient> | null = null

export function createClient() {
  if (_client) return _client
  _client = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  )
  return _client
}
