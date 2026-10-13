import { useMemo } from 'react'
import { Link } from '../lib/router'
import { PlanMarkdown } from '../components/Markdown'
import { headings, planRaw, linkifyPlanMarkdown } from '../lib/plan'

/** PlanPage — the complete FULL-PLAN.md, navigable, untrimmed.
 *  The visual pages make it easier to understand; they never replace it. */
export function PlanPage({ anchor }: { anchor?: string }) {
  const toc = useMemo(() => headings.filter((h) => h.level === 2 || h.level === 3), [])
  const wordCount = useMemo(() => planRaw.split(/\s+/).filter(Boolean).length, [])
  const lineCount = useMemo(() => planRaw.split('\n').length, [])

  return (
    <article className="planpage">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Overview</Link>
        <span aria-current="page">Full plan</span>
      </nav>
      <header className="plan-head">
        <p className="plan-head__eyebrow">Source of truth · bundled at build time · {headings.length} headings</p>
        <h1 className="plan-head__title">Towel (Super RAG) — Implementation Plan</h1>
        <p className="plan-head__meta">
          Oct 12, 2026 · @Sam · {lineCount.toLocaleString()} lines · ~{Math.round(wordCount / 1000)}k words · deep links
          work on every section
        </p>
      </header>
      <div className="plan-layout">
        <nav className="plan-toc" aria-label="Table of contents">
          <p className="plan-toc__title">Contents</p>
          <ul>
            {toc.map((h) => (
              <li key={h.id} className={h.level === 3 ? 'is-sub' : undefined}>
                <Link to={`/plan/${h.id}`} className={`plan-toc__link${h.id === anchor ? ' is-active' : ''}`}>
                  {h.text}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="plan-column">
          <PlanMarkdown markdown={linkifyPlanMarkdown(planRaw)} />
        </div>
      </div>
    </article>
  )
}
