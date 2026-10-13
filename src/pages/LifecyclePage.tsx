import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react'
import { PageHeader, StatusLabel, SourceReference, Callout } from '../components/ui'
import { DiagramCanvas, DiagramLegend } from '../components/diagram/Canvas'
import { RETRIEVAL_VIEW } from '../content/architecture'
import { LIFECYCLE_STEPS, TOOLBOX, AGENT_CONTROLS } from '../content/lifecycle'

/**
 * LifecyclePage — the defining feature of Towel, as a walkthrough.
 * The Retrieval view canvas highlights the current step; the panel below
 * narrates it. Play steps the loop automatically.
 */
export function LifecyclePage() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      setStep((s) => {
        if (s >= LIFECYCLE_STEPS.length - 1) {
          setPlaying(false)
          return s
        }
        return s + 1
      })
    }, 2600)
    return () => clearTimeout(t)
  }, [playing, step])

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (reducedMotion) setPlaying(false)
  }, [reducedMotion])

  const current = LIFECYCLE_STEPS[step]
  // Map lifecycle step → node highlighted in the canvas
  const nodeHighlight: Record<number, string | null> = {
    0: 'q',
    1: 'prompt',
    2: 'firstmove',
    3: 'loop',
    4: 'qs2',
    5: 'render',
    6: 'tools',
    7: 'ledger',
    8: 'answer',
  }
  const highlightId = nodeHighlight[step] ?? null

  // A minimal derived view for the canvas: same nodes, but mark active via selection
  const view = RETRIEVAL_VIEW

  return (
    <article>
      <PageHeader
        eyebrow="Agentic retrieval lifecycle"
        title="The toolbox loop, step by step"
        lead={
          <>
            This is the shape that makes Towel agentic: plan → choose tools → retrieve under scope → inspect →
            reformulate → stop on grounded evidence <em>or</em> a hard budget. Walk it manually, or press play.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="1-purpose-scope-and-thesis" label="§1 Thesis" />
            <SourceReference id="stage-6-agent-runtime-and-generated-tool-surface" label="Stage 6" />
          </>
        }
      />

      <div className="life-controls" role="group" aria-label="Step controls">
        <button type="button" className="btn btn--icon" aria-label="Previous step" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="btn btn--icon btn--primary"
          aria-label={playing ? 'Pause walkthrough' : 'Play walkthrough'}
          onClick={() => setPlaying((p) => !p)}
          disabled={reducedMotion}
          title={reducedMotion ? 'Autoplay disabled: reduced motion is on' : undefined}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="btn btn--icon"
          aria-label="Next step"
          disabled={step === LIFECYCLE_STEPS.length - 1}
          onClick={() => setStep((s) => Math.min(LIFECYCLE_STEPS.length - 1, s + 1))}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Restart walkthrough" onClick={() => { setStep(0); setPlaying(false) }}>
          <RotateCcw size={15} aria-hidden="true" />
        </button>
        <ol className="life-rail" aria-label="Lifecycle steps">
          {LIFECYCLE_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`life-dot life-dot--${s.status}${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                title={`${i}. ${s.label}`}
              >
                {i}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <DiagramCanvas
        view={view}
        selectedId={highlightId}
        onSelect={(id) => {
          const entry = Object.entries(nodeHighlight).find(([, v]) => v === id)
          if (entry) setStep(parseInt(entry[0], 10))
        }}
        ariaLabel="Agentic retrieval loop diagram"
      />
      <DiagramLegend
        items={[
          { color: 'var(--acc-violet)', label: 'Agent reasoning' },
          { color: 'var(--acc-cyan)', label: 'Scoped retrieval' },
          { color: 'var(--acc-amber)', label: 'Fusion & rerank' },
          { color: 'var(--acc-green)', label: 'Grounding & stopping' },
          { color: 'var(--text-muted)', label: 'Optional (flag)' },
        ]}
      />

      <section className="lifestep" aria-live="polite" key={current.id}>
        <div className="lifestep__head">
          <span className="lifestep__num">{String(step).padStart(2, '0')}</span>
          <h2 className="lifestep__title">{current.label}</h2>
          <StatusLabel kind={current.status === 'optional' ? 'flag' : current.status === 'guard' ? 'hard-requirement' : 'defined'} label={current.status === 'optional' ? 'Optional step' : current.status === 'guard' ? 'Budget guard' : undefined} />
        </div>
        <p className="lifestep__body">{current.body}</p>
        {current.budget ? (
          <p className="lifestep__budget">
            <strong>Budget:</strong> {current.budget}
          </p>
        ) : null}
        <SourceReference id={current.srcRef.id} label={current.srcRef.label} />
      </section>

      <section className="band" aria-labelledby="toolbox-title">
        <h2 id="toolbox-title" className="band__title">
          The toolbox, and when each tool exists
        </h2>
        <p className="band__lead">
          The agent’s surface is generated from its app’s collections and profiles. Tools light up as stages deliver the
          indexes they are backed by — deferred tools stay absent, not broken.
        </p>
        <div className="toolgrid" role="list" aria-label="Agent tools">
          {TOOLBOX.map((t) => (
            <span key={t.name} role="listitem" className={`toolchip${t.status === 'deferred' ? ' toolchip--deferred' : ''}`}>
              <code>{t.name}</code>
              <small>{t.mode}</small>
              <span className="toolchip__stage">{t.status === 'deferred' ? 'deferred · if evals justify' : `Stage ${t.stage}`}</span>
            </span>
          ))}
        </div>
        <Callout tone="info" title="Routing makes selection deterministic">
          Identifier-shaped queries schedule grep and find_symbol; ticket keys schedule get_ticket; quoted strings or
          stack-trace-like text schedule grep; plain how-to questions schedule search over document collections first.
          App routing hints render into the system prompt <em>and</em> feed these rules (Stage 12).
        </Callout>
      </section>

      <section className="band" aria-labelledby="controls-title">
        <h2 id="controls-title" className="band__title">
          What keeps the loop honest
        </h2>
        <div className="grid grid--controls">
          {AGENT_CONTROLS.map((c) => (
            <article className="control-card" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </section>
    </article>
  )
}
