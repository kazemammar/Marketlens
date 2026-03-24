'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme:  Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:  'dark',
  toggle: () => {},
})

// ─── CSS variable maps ─────────────────────────────────────────────────────

const DARK_VARS: Record<string, string> = {
  '--bg':          '#09090b',
  '--surface':     '#18181b',
  '--surface-2':   '#1c1c1f',
  '--surface-3':   '#222226',
  '--border':      '#27272a',
  '--text':        '#fafafa',
  '--text-2':      '#a1a1aa',
  '--text-muted':  '#71717a',
  '--accent':      '#10b981',
  '--accent-dim':  'rgba(16,185,129,0.12)',
  '--accent-glow': 'rgba(16,185,129,0.22)',
  '--danger':      '#ef4444',
  '--danger-dim':  'rgba(239,68,68,0.12)',
  '--warning':     '#f59e0b',
  '--warning-dim': 'rgba(245,158,11,0.12)',
  '--price-up':    '#00ff88',
  '--price-up-rgb':  '0,255,136',
  '--price-down':  '#ff4444',
  '--price-down-rgb':'255,68,68',
  '--price-flat':  '#888888',
  '--accent-rgb':  '16,185,129',
  '--danger-rgb':  '239,68,68',
  '--warning-rgb': '245,158,11',
}

const LIGHT_VARS: Record<string, string> = {
  '--bg':          '#f4f4f5',
  '--surface':     '#ffffff',
  '--surface-2':   '#e4e4e7',
  '--surface-3':   '#d4d4d8',
  '--border':      '#d1d5db',
  '--text':        '#09090b',
  '--text-2':      '#3f3f46',
  '--text-muted':  '#71717a',
  '--accent':      '#059669',
  '--accent-dim':  'rgba(5,150,105,0.10)',
  '--accent-glow': 'rgba(5,150,105,0.20)',
  '--danger':      '#dc2626',
  '--danger-dim':  'rgba(220,38,38,0.10)',
  '--warning':     '#d97706',
  '--warning-dim': 'rgba(217,119,6,0.10)',
  '--price-up':    '#059669',
  '--price-up-rgb':  '5,150,105',
  '--price-down':  '#dc2626',
  '--price-down-rgb':'220,38,38',
  '--price-flat':  '#6b7280',
  '--accent-rgb':  '5,150,105',
  '--danger-rgb':  '220,38,38',
  '--warning-rgb': '217,119,6',
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS

  // 1. Toggle .dark class (for Tailwind dark: utilities)
  root.classList.toggle('dark', theme === 'dark')

  // 2. Set color-scheme so browser chrome (scrollbars, inputs) matches
  root.style.colorScheme = theme

  // 3. Write every CSS variable directly as an inline style —
  //    inline styles have highest specificity and bypass all cascade issues
  Object.entries(vars).forEach(([prop, value]) => {
    root.style.setProperty(prop, value)
  })
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Read saved preference, apply immediately
    const saved = (localStorage.getItem('ml-theme') as Theme | null) ?? 'dark'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('ml-theme', next)
      applyTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
