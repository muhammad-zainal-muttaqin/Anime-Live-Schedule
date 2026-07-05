import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (q: string) => void
  className?: string
}

const DEBOUNCE_MS = 200

/**
 * Debounced title/studio search. Keeps a local draft so typing stays instant
 * while URL updates (and the re-filter) trail by one debounce tick.
 */
export function SearchInput({ value, onChange, className = '' }: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const committed = useRef(value)

  const cancelPending = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Adopt external changes (reset button, back/forward navigation).
  useEffect(() => {
    if (value !== committed.current) {
      cancelPending()
      committed.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => cancelPending, [])

  const commit = (next: string) => {
    cancelPending()
    committed.current = next
    onChange(next)
  }

  const handleInput = (next: string) => {
    setDraft(next)
    cancelPending()
    timer.current = setTimeout(() => commit(next), DEBOUNCE_MS)
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
      />
      <input
        type="search"
        value={draft}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft)
          if (e.key === 'Escape' && draft) {
            e.stopPropagation()
            setDraft('')
            commit('')
          }
        }}
        aria-label="Cari judul atau studio"
        placeholder="Cari judul atau studio…"
        className="h-9 w-full appearance-none rounded-lg bg-surface pl-9 pr-8 text-sm text-ink ring-1 ring-border transition placeholder:text-ink-subtle hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => {
            setDraft('')
            commit('')
          }}
          className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-ink-subtle transition hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
