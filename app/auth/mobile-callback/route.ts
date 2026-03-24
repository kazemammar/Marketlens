import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    return NextResponse.redirect(new URL('/?auth_error=1', origin))
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/?auth_error=1', origin))
  }

  // Redirect to custom URL scheme so the iOS app catches the tokens
  const params = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  return NextResponse.redirect(`marketlens://auth/callback?${params.toString()}`)
}
