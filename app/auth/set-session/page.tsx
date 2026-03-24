'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SetSessionInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    async function establish() {
      let accessToken  = searchParams.get('access_token')
      let refreshToken = searchParams.get('refresh_token')

      // Support one-time code exchange (from mobile-callback flow)
      const code = searchParams.get('code')
      if (!accessToken && code) {
        try {
          const res = await fetch('/api/auth/exchange-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })
          if (res.ok) {
            const data = await res.json()
            accessToken = data.access_token
            refreshToken = data.refresh_token
          }
        } catch { /* fall through to error */ }
      }

      if (!accessToken || !refreshToken) {
        setError(true)
        return
      }

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (sessionError) {
        setError(true)
      } else {
        router.replace('/')
      }
    }

    establish()
  }, [searchParams, router])

  if (error) {
    return (
      <>
        <p className="font-mono text-[14px] text-red-400">Sign in failed</p>
        <p className="mt-2 font-mono text-[11px] text-zinc-500">Please try again from the app.</p>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <p className="font-mono text-[14px] text-zinc-200">Signing you in...</p>
    </>
  )
}

export default function SetSession() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ background: '#09090b' }}
    >
      <Suspense
        fallback={
          <>
            <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="font-mono text-[14px] text-zinc-200">Signing you in...</p>
          </>
        }
      >
        <SetSessionInner />
      </Suspense>
    </div>
  )
}
