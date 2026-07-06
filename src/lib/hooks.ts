import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/**
 * Publishes an element's rendered height (border-box) to a CSS custom property
 * on the document root, kept in sync via ResizeObserver. Lets a sticky sibling
 * elsewhere in the tree offset itself by that height without hard-coding it.
 */
export function useHeightVar(
  ref: RefObject<HTMLElement | null>,
  varName: string,
): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const write = () => root.style.setProperty(varName, `${el.offsetHeight}px`)
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty(varName)
    }
  }, [ref, varName])
}

const FOCUSABLE_SELECTOR =
  'a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Modal/sheet behaviour in one hook: close on Escape, lock background scroll,
 * trap Tab focus inside `containerRef`, and restore focus to the opener on
 * unmount. On mount it focuses `initialFocusRef` if given, else the first
 * focusable child. Keeps every dialog on the site behaving identically.
 */
export function useDialog(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  // Read through a ref so an unstable `onClose` (e.g. a fresh closure each
  // render) never tears down and re-arms the whole dialog — setup runs once.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const container = containerRef.current

    // Recomputed on every Tab press so it tracks conditionally-rendered content.
    const focusables = (): HTMLElement[] => {
      if (!container) return []
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        // Nothing to focus — keep focus off the background entirely.
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      const inside = !!active && container?.contains(active)
      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initial = initialFocusRef?.current ?? focusables().at(0) ?? container
    initial?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus()
    }
  }, [containerRef, initialFocusRef])
}
