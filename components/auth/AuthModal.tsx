'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'

async function signInWithGoogle() {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })
  if (error) console.error('[Google OAuth]', error.message)
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

type Tab   = 'signin' | 'signup'
type State = 'idle' | 'busy' | 'success'

// ─── Eye icons ────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, placeholder, autoComplete, inputRef,
}: {
  label:        string
  type:         string
  value:        string
  onChange:     (v: string) => void
  placeholder:  string
  autoComplete: string
  inputRef?:    React.RefObject<HTMLInputElement | null>
}) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword && showPw ? 'text' : type

  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          className={`h-11 w-full rounded border border-[var(--border)] bg-[var(--surface)] font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 ${isPassword ? 'pr-10 pl-3.5' : 'px-3.5'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            tabIndex={-1}
          >
            {showPw ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen:  boolean
  onClose: () => void
}) {
  const { signIn, signUp } = useAuth()
  const [tab,      setTab]      = useState<Tab>('signin')
  const [state,    setState]    = useState<State>('idle')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [visible,  setVisible]  = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  // Enter animation
  useEffect(() => {
    if (isOpen) {
      setVisible(false)
      const id = requestAnimationFrame(() => setVisible(true))
      setTab('signin')
      setEmail('')
      setPassword('')
      setConfirm('')
      setError('')
      setState('idle')
      setTimeout(() => emailRef.current?.focus(), 80)
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
    }
  }, [isOpen])

  // Escape key
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (tab === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setState('busy')
    const result = tab === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    if (result.error) {
      setError(result.error)
      setState('idle')
    } else if (tab === 'signup') {
      setState('success')
    } else {
      onClose()
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError('')
    setPassword('')
    setConfirm('')
    setState('idle')
  }

  if (!isOpen) return null

  return createPortal(
    /* Overlay — portal into document.body, guaranteed above all stacking contexts */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full mx-4 max-w-[420px] overflow-y-auto rounded shadow-black/50"
        style={{
          backgroundColor: 'var(--surface)',
          border:          '1px solid var(--border)',
          maxHeight:       '90vh',
          boxShadow:       '0 0 60px rgba(16,185,129,0.06), 0 25px 50px rgba(0,0,0,0.8)',
          opacity:         visible ? 1 : 0,
          transform:       visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
          transition:      'opacity 200ms ease, transform 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-6 pt-7 pb-6">
          {/* Header */}
          <div className="mb-5 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border:     '1px solid rgba(16,185,129,0.25)',
                  boxShadow:  '0 0 20px rgba(16,185,129,0.15)',
                }}
              >
                <svg viewBox="0 0 14 14" fill="none" className="h-4 w-4" aria-hidden>
                  <polyline
                    points="1,11 4,7 7,8.5 10,4 13,2"
                    stroke="#10b981" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span style={{ fontSize: 16, letterSpacing: '-0.02em', fontWeight: 600 }}>
                <span style={{ color: 'var(--text)' }}>Market</span>
                <span style={{ color: '#10b981', textShadow: '0 0 12px rgba(16,185,129,0.35)' }}>Lens</span>
              </span>
            </div>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              Track markets. Stay ahead.
            </p>
          </div>

          {/* Pill tab switcher */}
          <div
            className="mb-5 flex rounded p-1"
            style={{ background: 'var(--surface)' }}
          >
            {(['signin', 'signup'] as const).map((t) => {
              const active = tab === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={`flex-1 rounded py-2 font-mono text-[11px] font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-[var(--surface-2)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {t === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              )
            })}
          </div>

          {/* Success state */}
          {state === 'success' ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              {/* Animated checkmark */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border:     '1px solid rgba(16,185,129,0.3)',
                  boxShadow:  '0 0 30px rgba(16,185,129,0.2)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-400" aria-hidden>
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="font-mono text-[14px] font-semibold text-[var(--text)]">Check your email</p>
                <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
                  We&apos;ve sent a confirmation link to{' '}
                  <span className="text-[var(--text)]">{email}</span>.
                  Click it to activate your account.
                </p>
              </div>
              <button
                onClick={() => switchTab('signin')}
                className="mt-1 flex h-10 w-full items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] font-mono text-[12px] text-[var(--text-muted)] transition hover:border-emerald-500/30 hover:text-[var(--text)]"
              >
                ← Back to Sign In
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Google OAuth */}
              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex h-11 w-full items-center justify-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] font-mono text-[12px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="font-mono text-[9px] uppercase text-[var(--text-muted)]">or</span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                inputRef={emailRef}
              />

              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              />

              {tab === 'signup' && (
                <Field
                  label="Confirm Password"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded border border-red-500/20 bg-red-500/5 px-4 py-3">
                  <span className="mt-px font-mono text-[10px] text-red-400" aria-hidden>⚠</span>
                  <p className="font-mono text-[11px] leading-relaxed text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state === 'busy'}
                className="flex h-11 w-full items-center justify-center gap-2 rounded bg-emerald-600 font-mono font-mono text-[12px] font-semibold text-[var(--text)] transition-colors hover:bg-emerald-500 active:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === 'busy' && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="text-center font-mono text-[10px] text-[var(--text-muted)]">
                {tab === 'signin'
                  ? <>Don&apos;t have an account?{' '}</>
                  : <>Already have an account?{' '}</>}
                <button
                  type="button"
                  onClick={() => switchTab(tab === 'signin' ? 'signup' : 'signin')}
                  className="text-emerald-400 transition hover:text-emerald-300 hover:underline"
                >
                  {tab === 'signin' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </form>
          )}
          {/* Security reassurance */}
          <p className="mt-4 text-center font-mono text-[8px] leading-[1.6] text-[var(--text-muted)] opacity-50">
            🔒 Your data is encrypted and never sold. Google sign-in uses OAuth 2.0.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
