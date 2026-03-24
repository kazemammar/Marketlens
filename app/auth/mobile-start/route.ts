import { NextResponse } from 'next/server'

/**
 * GET /auth/mobile-start
 *
 * Initiates Google OAuth for the iOS app.
 * Generates PKCE code_verifier + code_challenge server-side,
 * stores the verifier in a cookie, and redirects to Supabase OAuth.
 *
 * This avoids the PKCE mismatch that occurs when the web client
 * initiates OAuth (stores verifier in WKWebView cookies) but the
 * callback runs in ASWebAuthenticationSession (separate cookie store).
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '')

  // Generate PKCE code_verifier and code_challenge
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const verifier = base64url(bytes)

  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const challenge = base64url(new Uint8Array(digest))

  // Build Supabase OAuth URL
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: `${origin}/auth/mobile-callback`,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`

  // Redirect to Supabase OAuth, storing the verifier in a cookie.
  // ASWebAuthenticationSession preserves cookies for the same domain,
  // so mobile-callback will receive it when Supabase redirects back.
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('ml_pkce_verifier', verifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/auth',
  })
  return response
}

function base64url(bytes: Uint8Array): string {
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
