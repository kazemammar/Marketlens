import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // ── Supabase auth token refresh ───────────────────────────────────────
  // Refreshes expired tokens on every request so sessions don't go stale.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  // ── Security headers ──────────────────────────────────────────────────
  response.headers.set('X-Frame-Options',           'DENY')
  response.headers.set('X-Content-Type-Options',    'nosniff')
  response.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection',          '1; mode=block')
  response.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|og-image|sw\\.js|manifest\\.json).*)',
  ],
}
