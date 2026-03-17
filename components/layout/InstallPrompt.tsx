'use client'

import { useEffect, useState } from 'react'

// Capture the beforeinstallprompt event (Chrome/Android)
let deferredPrompt: Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null = null

export default function InstallPrompt() {
  const [show,      setShow]      = useState(false)
  const [isIOS,     setIsIOS]     = useState(false)
  const [hasPrompt, setHasPrompt] = useState(false)

  useEffect(() => {
    // Already installed in standalone mode — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Dismissed recently (7-day cooldown)
    const dismissed = localStorage.getItem('ml-install-dismissed')
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    const ua          = navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as never as { MSStream?: unknown }).MSStream
    const isAndroid   = /android/.test(ua)

    if (!isIOSDevice && !isAndroid) return

    setIsIOS(isIOSDevice)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as typeof deferredPrompt
      setHasPrompt(true)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Show after 3 s so user sees the app first
    const timer = setTimeout(() => setShow(true), 3000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    deferredPrompt = null
    setHasPrompt(false)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('ml-install-dismissed', Date.now().toString())
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9998] animate-slide-up safe-bottom">
      <div
        className="mx-3 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#111113] p-4"
        style={{ boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)' }}
      >
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="flex items-start gap-3.5">
          {/* Icon */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-7 w-7" aria-hidden>
              <polyline points="2,11 5,7 8,8.5 12,4" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="4" r="1.3" fill="#10b981"/>
            </svg>
          </div>

          <div className="min-w-0 flex-1 pr-6">
            <h3 className="font-mono text-[14px] font-bold text-white">Install MarketLens</h3>
            <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-zinc-400">
              Add to your home screen for instant access to live markets and AI analysis.
            </p>

            {/* iOS: Share button instructions */}
            {isIOS && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.8} className="h-5 w-5 shrink-0" aria-hidden>
                  <path d="M8 10l4-6 4 6M12 4v12" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 18h14" strokeLinecap="round"/>
                </svg>
                <p className="font-mono text-[11px] text-zinc-300">
                  Tap <span className="font-bold text-white">Share</span> then{' '}
                  <span className="font-bold text-white">"Add to Home Screen"</span>
                </p>
              </div>
            )}

            {/* Android: native install button */}
            {!isIOS && hasPrompt && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full rounded-xl py-2.5 font-mono text-[12px] font-semibold text-white transition hover:opacity-90 active:opacity-75"
                style={{ background: '#10b981' }}
              >
                Install App
              </button>
            )}

            {/* Android: manual instructions fallback */}
            {!isIOS && !hasPrompt && (
              <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
                <span className="font-mono text-lg leading-none text-zinc-300">⋮</span>
                <p className="font-mono text-[11px] text-zinc-300">
                  Tap <span className="font-bold text-white">Menu (⋮)</span> then{' '}
                  <span className="font-bold text-white">"Add to Home screen"</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
