'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function StockSearch() {
  const [value, setValue] = useState('')
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const sym = value.trim().toUpperCase()
    if (sym) {
      router.push(`/asset/stock/${encodeURIComponent(sym)}`)
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div
        className="flex h-9 items-center gap-2 rounded px-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: 220 }}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Search ticker… e.g. AAPL"
          className="flex-1 bg-transparent font-mono text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--text)]"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="flex h-9 items-center rounded px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text)] transition"
        style={{ background: 'var(--accent)', opacity: value.trim() ? 1 : 0.4 }}
        disabled={!value.trim()}
      >
        Go
      </button>
    </form>
  )
}
