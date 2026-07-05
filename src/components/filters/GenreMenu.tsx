import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Tags } from 'lucide-react'

interface GenreMenuProps {
  options: Array<{ genre: string; count: number }>
  selected: string[]
  onToggle: (genre: string) => void
  onClear: () => void
  includeAdult: boolean
  onAdultChange: (includeAdult: boolean) => void
}

/**
 * Disclosure button + checkbox panel for the multi-select genre facet.
 * The 16+ content toggle lives here too — it's a content facet, not a
 * toolbar-level control.
 */
export function GenreMenu({
  options,
  selected,
  onToggle,
  onClear,
  includeAdult,
  onAdultChange,
}: GenreMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Close on outside click while open.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const badgeCount = selected.length + (includeAdult ? 1 : 0)
  const active = badgeCount > 0

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 items-center gap-1.5 rounded-lg bg-surface px-3 text-sm font-medium ring-1 transition hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
          active
            ? 'text-ink ring-accent-line'
            : 'text-ink-muted ring-border hover:text-ink'
        }`}
      >
        <Tags aria-hidden className="h-4 w-4" />
        Genre
        {active ? (
          <span className="rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent tabular-nums">
            {badgeCount}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label="Filter genre"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              buttonRef.current?.focus()
            }
          }}
          className="animate-pop-in absolute left-0 z-40 mt-2 w-64 max-w-[calc(100vw-2.5rem)] rounded-xl bg-elevated p-2 shadow-xl shadow-black/40 ring-1 ring-border sm:left-auto sm:right-0"
        >
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-1">
            <p className="text-xs font-semibold text-ink-subtle">Pilih genre</p>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded text-xs font-medium text-accent transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                Hapus semua
              </button>
            ) : null}
          </div>
          <div className="max-h-64 overflow-y-auto">
            <GenreList
              options={options}
              selected={selected}
              onToggle={onToggle}
            />
          </div>
          <div className="mt-1.5 border-t border-border pt-1.5">
            <AdultToggleRow checked={includeAdult} onChange={onAdultChange} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Checkbox rows for the genre facet — shared by the popover and the mobile sheet. */
export function GenreList({
  options,
  selected,
  onToggle,
}: Pick<GenreMenuProps, 'options' | 'selected' | 'onToggle'>) {
  if (options.length === 0) {
    return (
      <p className="px-2.5 py-2 text-sm text-ink-subtle">
        Tidak ada genre di hasil ini.
      </p>
    )
  }
  return (
    <>
      {options.map(({ genre, count }) => {
        const checked = selected.includes(genre)
        return (
          <label
            key={genre}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(genre)}
              className="h-4 w-4 shrink-0 accent-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            />
            <span
              className={`flex-1 ${checked ? 'font-medium text-ink' : 'text-ink-muted'}`}
            >
              {genre}
            </span>
            <span className="text-xs text-ink-subtle tabular-nums">
              {count}
            </span>
          </label>
        )
      })}
    </>
  )
}

/** The 16+ content switch — shared by the genre popover and the mobile sheet. */
export function AdultToggleRow({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition select-none hover:bg-white/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      />
      <span
        className={`flex-1 ${checked ? 'font-medium text-ink' : 'text-ink-muted'}`}
      >
        Tampilkan konten 16+
      </span>
    </label>
  )
}
