import { useState } from 'react'
import {
  Terminal,
  Sparkles,
  Search,
  Layers,
  GitBranch,
  ShieldCheck,
  Quote,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react'
import { MetricCard, SourceReference, Callout } from '../components/ui'
import { HierarchyDiagram } from '../components/diagram/HierarchyDiagram'
import { RoadmapStrip } from '../components/diagram/RoadmapStrip'
import { FIXED_VS_AGENT, PRINCIPLES, SUCCESS_METRICS, HIERARCHY } from '../content/overview'
import { navigate } from '../lib/router'

const PRINCIPLE_ICONS = {
  search: Search,
  layers: Layers,
  scissors: GitBranch,
  quote: Quote,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
}

export function OverviewPage() {
  const [level, setLevel] = useState(0)
  const activeLevel = HIERARCHY[level]

  return (
    <article>
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__badge">
          <Sparkles size={13} aria-hidden="true" /> Super RAG · Implementation Plan · Oct 12, 2026
        </p>
        <h1 id="hero-title" className="hero__title">
          An agent with a <em>toolbox of search</em>,
          <br />
          not a fixed pipeline.
        </h1>
        <p className="hero__lead">
          <strong>Towel</strong> is a multi-app, agentic RAG platform. A new app is onboarded by writing{' '}
          <strong>configuration, not retrieval code</strong>. The agent plans, calls tools — grep, glob, lexical, hybrid,
          outline, symbols, links — inspects results, reformulates, and stops when it has grounded evidence, under a hard
          budget. Every answer cites sources with locators and dates.
        </p>
        <div className="hero__cta">
          <button type="button" className="btn btn--primary" onClick={() => navigate('/roadmap')}>
            Explore the roadmap <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button type="button" className="btn" onClick={() => navigate('/architecture')}>
            Architecture explorer
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/plan')}>
            Read the full plan
          </button>
        </div>
        <dl className="hero__stats" aria-label="Plan at a glance">
          <div>
            <dt>Build stages</dt>
            <dd>
              0 → 15 <span className="hero__statsub">gated, one agent each</span>
            </dd>
          </div>
          <div>
            <dt>First app</dt>
            <dd>
              ctrl-f <span className="hero__statsub">5 collections</span>
            </dd>
          </div>
          <div>
            <dt>Store</dt>
            <dd>
              Postgres <span className="hero__statsub">pgvector · FTS · trigram · RLS</span>
            </dd>
          </div>
          <div>
            <dt>Isolation</dt>
            <dd>
              Before retrieval <span className="hero__statsub">never in the prompt</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="band" aria-labelledby="fixed-agent-title">
        <h2 id="fixed-agent-title" className="band__title">
          What “agentic” actually changes
        </h2>
        <p className="band__lead">
          Towel does not run a fixed retrieve-then-generate loop. The same primitives that power fixed RAG become{' '}
          <em>tools the agent selects from</em> — and the loop keeps going until evidence is grounded or a budget stops it.
        </p>
        <div className="compare" role="table" aria-label="Fixed pipeline versus agent-directed retrieval">
          <div className="compare__head compare__head--fixed" role="columnheader">
            <Terminal size={15} aria-hidden="true" /> Fixed pipeline RAG
          </div>
          <div className="compare__head compare__head--agent" role="columnheader">
            <Sparkles size={15} aria-hidden="true" /> Agent-directed retrieval
          </div>
          {FIXED_VS_AGENT.map((row) => (
            <div key={row.aspect} className="compare__row" role="row">
              <p className="compare__aspect">{row.aspect}</p>
              <p className="compare__fixed" role="cell">{row.fixed}</p>
              <p className="compare__agent" role="cell">{row.agent}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="hierarchy-title">
        <h2 id="hierarchy-title" className="band__title">
          One platform, many apps
        </h2>
        <p className="band__lead">
          The whole product hangs off one hierarchy. <strong>Apps</strong> are tenant boundaries owning an agent config;{' '}
          <strong>collections</strong> are retrieval units ingested through one profile; <strong>units</strong> carry the
          locators that become citations. Select a level:
        </p>
        <HierarchyDiagram active={level} onSelect={setLevel} />
        <div className="hier-caption" aria-live="polite">
          <p className="hier-caption__term" data-color={activeLevel.color}>
            {activeLevel.term}
          </p>
          <p className="hier-caption__one">{activeLevel.oneLiner}</p>
          <p className="hier-caption__body">{activeLevel.detail}</p>
          <p className="hier-caption__ex">
            <code>{activeLevel.example}</code>
          </p>
          <SourceReference id="3-system-architecture" label="§3 Hierarchy" />
        </div>
      </section>

      <section className="band" aria-labelledby="principles-title">
        <h2 id="principles-title" className="band__title">
          Design principles, straight from the research
        </h2>
        <p className="band__lead">
          Four research conclusions drive every stage: agentic grep is competitive on code and identifiers; the production
          pattern is hybrid + rerank; each source type needs its own segmentation; isolation lives in the database.
        </p>
        <div className="grid grid--principles">
          {PRINCIPLES.map((p) => {
            const Icon = PRINCIPLE_ICONS[p.icon]
            return (
              <article className="principle" key={p.title}>
                <span className="principle__icon">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <SourceReference id={p.srcRef.id} label={p.srcRef.label} />
              </article>
            )
          })}
        </div>
        <Callout tone="warn" title="Research numbers are directional">
          Figures gathered in October 2026 come from search results and secondary write-ups; vendor-reported numbers are
          marked as such. Stage 13 exists to validate every choice on Towel’s own data.
        </Callout>
      </section>

      <section className="band" aria-labelledby="criteria-title">
        <h2 id="criteria-title" className="band__title">
          How success will be measured
        </h2>
        <p className="band__lead">
          Every card is a plan-defined goal. None of them are results — there are no measured numbers yet, and the site
          will not invent any.
        </p>
        <div className="grid grid--metrics">
          {SUCCESS_METRICS.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="staging-title">
        <h2 id="staging-title" className="band__title">
          The build, staged
        </h2>
        <p className="band__lead">
          A strict chain through Stage 6 freezes the contracts. Then four profile stages run in parallel. Then quality,
          then product, then optional extensions — only if evals justify them.
        </p>
        <RoadmapStrip />
      </section>
    </article>
  )
}
