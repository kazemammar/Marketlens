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

  const appUrl = `marketlens://auth/callback?code=${otp}`

  // Safari blocks HTTP 302 redirects to custom URL schemes.
  // Serve a small HTML page that does the redirect via JavaScript instead.
  return new Response(
    `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#09090b;color:#fafafa;font-family:ui-monospace,monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="text-align:center">
    <p style="font-size:14px">Returning to MarketLens...</p>
    <p style="font-size:11px;color:#71717a;margin-top:8px">If the app doesn't open, <a href="${appUrl}" style="color:#10b981">tap here</a>.</p>
  </div>
  <script>window.location.href=${JSON.stringify(appUrl)};</script>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
