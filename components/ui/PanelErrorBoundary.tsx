'use client'

import { Component, type ReactNode } from 'react'
import MobileFullscreen from './MobileFullscreen'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

class PanelErrorBoundaryInner extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error(`[PanelErrorBoundary] ${this.props.fallbackTitle ?? 'Panel'} crashed:`, error.message)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--price-down)]" aria-hidden>
              <path d="M8 1l7 14H1L8 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <line x1="8" y1="6" x2="8" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {this.props.fallbackTitle ?? 'Panel'} unavailable
            </span>
          </div>
          <p className="font-mono text-[9px] text-[var(--text-muted)]">
            This section encountered an error and has been isolated to prevent affecting the rest of the page.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Error boundary with mobile fullscreen toggle.
 * Wraps the error boundary in a MobileFullscreen shell so every panel
 * gets a free expand button on mobile — zero changes to page.tsx needed.
 */
export default function PanelErrorBoundary({ children, fallbackTitle }: Props) {
  // Skip fullscreen wrapper for panels with empty titles (e.g. WatchlistAlerts)
  if (!fallbackTitle) {
    return (
      <PanelErrorBoundaryInner fallbackTitle={fallbackTitle}>
        {children}
      </PanelErrorBoundaryInner>
    )
  }

  return (
    <MobileFullscreen title={fallbackTitle}>
      <PanelErrorBoundaryInner fallbackTitle={fallbackTitle}>
        {children}
      </PanelErrorBoundaryInner>
    </MobileFullscreen>
  )
}
