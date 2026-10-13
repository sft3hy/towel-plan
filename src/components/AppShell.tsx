import { useEffect, useState, type ReactNode } from 'react'
import { Menu, X, Search, Moon, Sun, ChevronRight } from 'lucide-react'
import { NAV_GROUPS, TOP_NAV } from '../content/nav'
import { STAGES } from '../content/stages'
import { Link, navigate, useRoute } from '../lib/router'
import { SearchDialog, useSearchHotkey } from './SearchDialog'

/** AppShell — persistent top bar, sticky section sidebar, reading column. */
export function AppShell({ children }: { children: ReactNode }) {
  const route = useRoute()
  const [mobileNav, setMobileNav] = useState(false)
  const [searchOpen, openSearch, closeSearch] = useSearchHotkey()
  const [theme, setTheme] = useState<string>(() => document.documentElement.getAttribute('data-theme') ?? 'dark')

  const active = '/' + (route.segments[0] ?? '')

  useEffect(() => {
    setMobileNav(false)
  }, [route.path])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('towel-theme', next)
    } catch {
      /* private mode */
    }
    setTheme(next)
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <button
          type="button"
          className="topbar__burger"
          aria-label={mobileNav ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNav}
          onClick={() => setMobileNav((m) => !m)}
        >
          {mobileNav ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Link to="/" className="brand" aria-label="Towel home">
          <TowelMark />
          <span className="brand__name">
            towel<span className="brand__sub">super RAG · implementation explorer</span>
          </span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          {TOP_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`topnav__link${active === item.to ? ' is-active' : ''}`}
              aria-current={active === item.to ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="topbar__actions">
          <button type="button" className="topbar__iconbtn" onClick={openSearch} aria-label="Search (Command K)">
            <Search size={16} aria-hidden="true" />
            <kbd aria-hidden="true">⌘K</kbd>
          </button>
          <button type="button" className="topbar__iconbtn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="shell__body">
        <aside className={`sidebar${mobileNav ? ' is-open' : ''}`} aria-label="Sections" id="sidebar">
          <nav>
            {NAV_GROUPS.map((g) => (
              <div className="sidebar__group" key={g.id}>
                <p className="sidebar__grouplabel">{g.label}</p>
                {g.items.map((item) => {
                  const isActive = active === item.to || (item.to === '/roadmap' && active === '/stage')
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`sidebar__link${isActive ? ' is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span>{item.label}</span>
                      <ChevronRight size={13} aria-hidden="true" className="sidebar__chev" />
                    </Link>
                  )
                })}
                {g.id === 'delivery' ? (
                  <div className="sidebar__stages" aria-label="Implementation stages">
                    {STAGES.map((s) => (
                      <Link
                        key={s.n}
                        to={`/stage/${s.n}`}
                        className={`sidebar__stage${active === '/stage' && route.segments[1] === String(s.n) ? ' is-active' : ''}`}
                      >
                        <span className={`stage-chip stage-chip--${s.topic}`}>{pad(s.n)}</span>
                        <span className="sidebar__stagename">{s.short}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </aside>
        {mobileNav ? (
          <button
            type="button"
            className="sidebar__scrim"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        ) : null}
        <main id="main" className="content" tabIndex={-1}>
          {children}
          <footer className="footer">
            <p>
              Towel (Super RAG) — implementation plan explorer · Source of truth:{' '}
              <button type="button" className="footer__link" onClick={() => navigate('/plan')}>
                FULL-PLAN.md
              </button>{' '}
              · Oct 12, 2026 · All figures are plan-defined targets unless labeled otherwise.
            </p>
          </footer>
        </main>
      </div>
      <SearchDialog open={searchOpen} onClose={closeSearch} />
    </div>
  )
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function TowelMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="7" fill="var(--acc-cyan)" opacity="0.14" />
      <rect x="8" y="8" width="16" height="16" rx="3.5" fill="none" stroke="var(--acc-cyan)" strokeWidth="1.6" />
      <path d="M8 13.5h16M8 18.5h16" stroke="var(--acc-cyan)" strokeWidth="1.2" opacity="0.55" />
      <circle cx="16" cy="16" r="2.2" fill="var(--acc-cyan)" />
    </svg>
  )
}
