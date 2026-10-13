import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, CornerDownLeft, X } from 'lucide-react'
import { searchDocs, type SearchDoc } from '../lib/search'
import { navigate } from '../lib/router'

/**
 * SearchDialog — ⌘K / Ctrl+K / "/" command palette over the bundled index.
 * Keyboard-operable: arrows move selection, Enter navigates, Esc closes.
 */

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const results: SearchDoc[] = useMemo(() => searchDocs(query), [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSel(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setSel(0), [query])

  const go = useCallback(
    (doc?: SearchDoc) => {
      const target = doc ?? results[sel]
      if (!target) return
      onClose()
      navigate(target.to)
    },
    [results, sel, onClose],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSel((s) => Math.min(s + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSel((s) => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results.length, go, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <div className="sdlg" role="presentation" onClick={onClose}>
      <div className="sdlg__panel" role="dialog" aria-modal="true" aria-label="Search the plan" onClick={(e) => e.stopPropagation()}>
        <div className="sdlg__inputrow">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stages, tools, terms, plan sections…"
            aria-label="Search query"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="sdlg-results"
          />
          <button type="button" className="sdlg__close" onClick={onClose} aria-label="Close search">
            <X size={15} />
          </button>
        </div>
        {query.trim().length >= 2 && results.length === 0 ? (
          <p className="sdlg__empty" role="status">
            No matches for “{query}”. Try “grep”, “RRF”, “Stage 13”, “fail closed”.
          </p>
        ) : null}
        <ul id="sdlg-results" ref={listRef} className="sdlg__results" role="listbox" aria-label="Search results">
          {results.map((r, i) => (
            <li key={r.to + r.title} role="option" aria-selected={i === sel} data-i={i}>
              <button
                type="button"
                className={`sdlg__hit${i === sel ? ' is-sel' : ''}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => go(r)}
              >
                <span className={`sdlg__kind sdlg__kind--${r.kind.replace(/\s+/g, '').toLowerCase()}`}>{r.kind}</span>
                <span className="sdlg__hitmain">
                  <span className="sdlg__title">{r.title}</span>
                  {r.snippet ? <span className="sdlg__snippet">{r.snippet}</span> : null}
                </span>
                {i === sel ? <CornerDownLeft size={13} aria-hidden="true" className="sdlg__go" /> : null}
              </button>
            </li>
          ))}
        </ul>
        <p className="sdlg__foot">
          <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd> to open · <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to go ·{' '}
          <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}

export function useSearchHotkey(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return [open, () => setOpen(true), () => setOpen(false)]
}
