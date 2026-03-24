import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redis } from '@/lib/cache/redis'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/?auth_error=1', origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()     { return cookieStore.getAll() },
        setAll(list) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    },
  )

  // Use the session returned directly from exchangeCodeForSession —
  // calling getSession() separately can return null in this context.
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError || !data.session) {
    return NextResponse.redirect(new URL('/?auth_error=1', origin))
  }

  const { session } = data

  // Store tokens in Redis under a short-lived one-time code.
  // This keeps long JWTs out of the URL (avoids length limits and leaks).
  const otp = crypto.randomUUID()
  await redis.set(`auth:otp:${otp}`, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  }, { ex: 60 })

  // HTTP 302 redirect to the custom URL scheme.
  // ASWebAuthenticationSession captures this automatically.
  const appUrl = `marketlens://auth/callback?code=${otp}`
  return new Response(null, {
    status: 302,
    headers: { Location: appUrl },
  })
}
