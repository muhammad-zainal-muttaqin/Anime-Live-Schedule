import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface SelectProps<T extends string | number> {
  /** Accessible name for the button and listbox. */
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  buttonClassName?: string
  panelClassName?: string
}

/**
 * Custom single-select listbox. The native `<select>` popup is OS-drawn and
 * can't be themed, so it clashed with the dark UI; this renders the open
 * list as a styled panel (same vocabulary as GenreMenu) while keeping the
 * full keyboard path: arrows, Home/End, type-ahead, Enter/Esc.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  buttonClassName = '',
  panelClassName = '',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', at: 0 })
  const baseId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const openList = () => {
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex)
    setOpen(true)
  }
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }
  const commit = (index: number) => {
    const opt = options[index]
    close(true)
    if (opt.value !== value) onChange(opt.value)
  }

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

  // Focus the list on open so arrow keys work immediately.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true })
  }, [open])

  // Keep the active option visible (matters for the long year list).
  useEffect(() => {
    if (!open) return
    document
      .getElementById(`${baseId}-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, baseId])

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        close(true)
        break
      case 'Tab':
        setOpen(false)
        break
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
        const now = Date.now()
        const text =
          (now - typed.current.at < 600 ? typed.current.text : '') +
          e.key.toLowerCase()
        typed.current = { text, at: now }
        const idx = options.findIndex((o) =>
          o.label.toLowerCase().startsWith(text),
        )
        if (idx >= 0) setActiveIndex(idx)
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openList()
          }
        }}
        className={`flex h-9 items-center gap-1.5 rounded-lg bg-surface pl-3 pr-2.5 text-sm font-medium text-ink ring-1 ring-border transition hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${buttonClassName}`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          aria-hidden
          className={`h-3.5 w-3.5 shrink-0 text-ink-subtle transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${baseId}-${activeIndex}`}
          onKeyDown={onListKeyDown}
          className={`animate-pop-in absolute left-0 z-40 mt-2 max-h-72 w-max min-w-full overflow-y-auto rounded-xl bg-elevated p-1.5 shadow-xl shadow-black/40 ring-1 ring-border focus-visible:outline-none ${panelClassName}`}
        >
          {options.map((opt, i) => {
            const isSelected = i === selectedIndex
            const isActive = i === activeIndex
            return (
              <div
                key={String(opt.value)}
                id={`${baseId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(i)}
                onMouseMove={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-white/5 text-ink'
                    : isSelected
                      ? 'text-ink'
                      : 'text-ink-muted'
                }`}
              >
                <span className={isSelected ? 'font-medium' : undefined}>
                  {opt.label}
                </span>
                {isSelected ? (
                  <Check aria-hidden className="h-4 w-4 text-accent" />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
