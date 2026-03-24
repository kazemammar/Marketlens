'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MobileCallback() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = createClient()
        const { data: { session }, error } = await supabase.auth.getSession()

        if (session && !error) {
          setStatus('success')
          // Redirect to the iOS app via custom URL scheme
          const params = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
          setTimeout(() => {
            window.location.href = `marketlens://auth/callback?${params.toString()}`
          }, 1000)
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] px-4 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background:
            status === 'success'
              ? 'rgba(16,185,129,0.1)'
              : status === 'error'
                ? 'rgba(239,68,68,0.1)'
                : 'rgba(255,255,255,0.05)',
        }}
      >
        {status === 'processing' && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        )}
        {status === 'success' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2} className="h-8 w-8">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === 'error' && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2} className="h-8 w-8">
            <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h1 className="font-mono text-[18px] font-bold text-[var(--text)]">
        {status === 'processing' && 'Signing you in...'}
        {status === 'success' && 'Success! Returning to app...'}
        {status === 'error' && 'Sign in failed'}
      </h1>
      <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
        {status === 'processing' && 'Please wait while we complete authentication.'}
        {status === 'success' && 'You will be redirected to MarketLens automatically.'}
        {status === 'error' && 'Please try again from the app.'}
      </p>
      {status === 'error' && (
        <a
          href="/"
          className="mt-4 rounded px-4 py-2 font-mono text-[12px]"
          style={{ background: 'var(--accent)', color: 'black' }}
        >
          Go to MarketLens
        </a>
      )}
    </div>
  )
}
