import { cookies } from 'next/headers'
import { redis } from '@/lib/cache/redis'

/**
 * GET /auth/mobile-callback
 *
 * Called by Supabase after Google OAuth completes.
 * Reads the PKCE code_verifier from the cookie set by /auth/mobile-start,
 * exchanges the auth code for tokens via Supabase REST API,
 * stores tokens in Redis under a one-time code, and redirects
 * to the app's custom URL scheme.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return redirect('marketlens://auth/callback?error=oauth')
  }

  // Read PKCE code_verifier from cookie (set by /auth/mobile-start)
  const cookieStore = await cookies()
  const verifier = cookieStore.get('ml_pkce_verifier')?.value

  if (!verifier) {
    return redirect('marketlens://auth/callback?error=no_verifier')
  }

  // Exchange auth code + code_verifier for tokens via Supabase REST API.
  // We call the API directly instead of using createServerClient because
  // the SSR client expects its own cookie-based verifier which doesn't
  // exist in the ASWebAuthenticationSession cookie context.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier,
    }),
  })

  if (!tokenRes.ok) {
    return redirect('marketlens://auth/callback?error=exchange')
  }

  const tokenData = await tokenRes.json()
  const accessToken  = tokenData.access_token
  const refreshToken = tokenData.refresh_token

  if (!accessToken || !refreshToken) {
    return redirect('marketlens://auth/callback?error=no_tokens')
  }

  // Store tokens in Redis under a short-lived one-time code.
  const otp = crypto.randomUUID()
  await redis.set(`auth:otp:${otp}`, {
    access_token: accessToken,
    refresh_token: refreshToken,
  }, { ex: 60 })

  // Clean up the PKCE cookie
  cookieStore.delete('ml_pkce_verifier')

  // 302 redirect to the custom URL scheme.
  // ASWebAuthenticationSession captures this automatically.
  return redirect(`marketlens://auth/callback?code=${otp}`)
}

function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}
