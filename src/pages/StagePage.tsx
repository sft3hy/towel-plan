import { useMemo } from 'react'
import { ChevronRight, ScrollText, ChevronLeft } from 'lucide-react'
import { StatusLabel, SourceReference, Callout } from '../components/ui'
import { PlanMarkdown } from '../components/Markdown'
import { stageByN, TOPIC_LABEL, PHASES } from '../content/stages'
import { acceptanceTestCount, findHeading, linkifyPlanMarkdown, stageMarkdown, stageSubsectionMarkdown } from '../lib/plan'
import { Link, navigate } from '../lib/router'

/** StagePage — full card for one stage: structured header, then the plan's
 *  complete untrimmed text for that stage. Accepts ids like "8", "14A", "15C". */
export function StagePage({ id }: { id: string }) {
  const numeric = parseInt(id, 10)
  const meta = stageByN(Number.isNaN(numeric) ? -1 : numeric)

  const sub = meta?.subStages?.find((s) => s.id === id)
  const isSub = Boolean(sub)

  const markdown = useMemo(() => {
    if (isSub && id.startsWith('15')) {
      // Stage 15 extensions live in one table; show the whole stage.
      return stageMarkdown(15)
    }
    if (isSub) return stageSubsectionMarkdown(id)
    return stageMarkdown(meta?.n ?? -1)
  }, [id, isSub, meta?.n])

  const heading = useMemo(() => {
    if (!meta) return undefined
    const tag = isSub ? id : String(meta.n)
    return findHeading(new RegExp(`^Stage ${tag}[:\\s]`))
  }, [meta, isSub, id])

  if (!meta) return <NotFoundStage id={id} />

  const phase = PHASES.find((p) => p.id === meta.phase)
  const tests = acceptanceTestCount(meta.n)

  return (
    <article className="stagepage">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/roadmap">Roadmap</Link>
        <ChevronRight size={12} aria-hidden="true" />
        {isSub ? (
          <>
            <Link to={`/stage/${meta.n}`}>Stage {meta.n}</Link>
            <ChevronRight size={12} aria-hidden="true" />
            <span aria-current="page">Stage {id}</span>
          </>
        ) : (
          <span aria-current="page">Stage {meta.n}</span>
        )}
      </nav>

      <header className={`stage-head stage-head--${meta.topic}`}>
        <div className="stage-head__num" aria-hidden="true">{isSub ? id : meta.n}</div>
        <div className="stage-head__main">
          <p className="stage-head__kicker">
            {phase?.label ?? ''} · {TOPIC_LABEL[meta.topic]}
          </p>
          <h1 className="stage-head__title">{isSub ? `Stage ${sub!.id}: ${sub!.name}` : meta.name}</h1>
          {isSub ? <p className="stage-head__focus">{sub!.focus}</p> : null}
          <p className="stage-head__visible">
            <strong>A human can see:</strong>{' '}
            <span dangerouslySetInnerHTML={{ __html: meta.visible.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
          </p>
          <div className="stage-head__chips">
            <StatusLabel kind="stage" label={`Gate: ${meta.gate}`} />
            {meta.dependsOn.length ? (
              <span className="dep-chips">
                Depends on:{' '}
                {meta.dependsOn.map((d) => (
                  <button key={d} type="button" className="dep-link" onClick={() => navigate(`/stage/${d}`)}>
                    Stage {d}
                  </button>
                ))}
              </span>
            ) : (
              <span className="dep-chips">No dependencies</span>
            )}
            {meta.parallelGroup ? <StatusLabel kind="defined" label="Can run in parallel" /> : null}
          </div>
          {meta.dependsLabel ? <p className="stage-head__deplabel">{meta.dependsLabel}</p> : null}
        </div>
        <div className="stage-head__side">
          <div className="stage-stat">
            <span className="stage-stat__value">{isSub ? (meta.n === 15 ? meta.subStages?.length ?? 0 : '') : tests || '—'}</span>
            <span className="stage-stat__label">{isSub ? (meta.n === 15 ? 'extensions' : 'sub-stage') : 'acceptance tests listed'}</span>
          </div>
          {heading ? (
            <a className="btn btn--sm" href={`#/plan/${heading.id}`}>
              <ScrollText size={14} aria-hidden="true" /> Full text in plan
            </a>
          ) : null}
        </div>
      </header>

      <div className="stage-tags">
        {meta.tags.map((t) => (
          <code key={t} className="tag">{t}</code>
        ))}
      </div>

      {meta.subStages ? (
        <nav className="subnav" aria-label={`Stage ${meta.n} sub-stages`}>
          {meta.subStages.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`subnav__chip${isSub && s.id === id ? ' is-active' : ''}`}
              onClick={() => navigate(`/stage/${s.id}`)}
            >
              <strong>{s.id}</strong> {s.name}
            </button>
          ))}
        </nav>
      ) : null}

      {isSub && meta.n === 15 ? (
        <Callout tone="defer" title="Every extension is gated on evidence">
          15A–15F start only when Stage 13 evals (or a business requirement) show a need. Each runs as its own mini-stage
          under the same hand-off protocol, adds eval cases <em>before</em> implementation, and may never weaken Stage 2
          isolation guarantees.
        </Callout>
      ) : null}

      <section className="stage-body" aria-label={`Full plan text for stage ${id}`}>
        <PlanMarkdown markdown={linkifyPlanMarkdown(markdown)} />
      </section>

      <footer className="stage-foot">
        <button type="button" className="btn btn--ghost" onClick={() => navigate(`/stage/${meta.n - 1}`)} disabled={meta.n === 0 && !isSub}>
          <ChevronLeft size={14} aria-hidden="true" /> Stage {meta.n - 1}
        </button>
        <SourceReference id={heading?.id ?? ''} label={heading ? `Read “${heading.text}” in the plan` : 'Full plan'} />
        <button type="button" className="btn btn--ghost" onClick={() => navigate(`/stage/${meta.n + 1}`)} disabled={meta.n === 15}>
          Stage {meta.n + 1} <ChevronRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </article>
  )
}

function NotFoundStage({ id }: { id: string }) {
  return (
    <article className="notfound">
      <h1>No stage “{id}”</h1>
      <p>Stages run from 0 to 15, with sub-stages 14A–14D and 15A–15F.</p>
      <button type="button" className="btn btn--primary" onClick={() => navigate('/roadmap')}>
        Back to the roadmap
      </button>
    </article>
  )
}
