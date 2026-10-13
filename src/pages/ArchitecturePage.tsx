import { useMemo, useState } from 'react'
import { ArrowDown, Boxes, Database, Radio, ShieldCheck, Gauge, GitPullRequestArrow } from 'lucide-react'
import { PageHeader, StatusLabel, SourceReference, Callout } from '../components/ui'
import { DiagramCanvas, DiagramLegend } from '../components/diagram/Canvas'
import { ARCH_VIEWS, CONTEXT_VIEW } from '../content/architecture'
import { PROFILE_MATRIX, ALL_TOOLS_NOTE } from '../content/dataModel'
import { KEY_DECISIONS } from '../content/decisions'

const VIEW_ICONS: Record<string, typeof Boxes> = {
  context: Boxes,
  ingestion: GitPullRequestArrow,
  retrieval: Radio,
  security: ShieldCheck,
  evaluation: Gauge,
}

function kickerFor(topic: string): string {
  const names: Record<string, string> = {
    neutral: 'Infrastructure',
    cyan: 'Retrieval',
    violet: 'Agent',
    amber: 'Pipeline / decision',
    green: 'Enforcement / validation',
    infra: 'Infrastructure',
    retrieval: 'Retrieval',
    agent: 'Agent',
    profile: 'Source profile',
    quality: 'Quality',
    product: 'Product',
  }
  return names[topic] ?? 'Component'
}

export function ArchitecturePage() {
  const [viewId, setViewId] = useState<string>(CONTEXT_VIEW.id)
  const view = useMemo(() => ARCH_VIEWS.find((v) => v.id === viewId) ?? CONTEXT_VIEW, [viewId])
  const [selected, setSelected] = useState<string | null>(null)
  const node = view.nodes.find((n) => n.id === selected) ?? null

  return (
    <article>
      <PageHeader
        eyebrow="Architecture explorer"
        title="Five parts. One scoped path."
        lead={
          <>
            Read top to bottom: clients reach an app’s agent, the agent reaches data only through{' '}
            <code>QueryService</code>, and ingestion writes into the same store from below. Pick a layer to explore, then
            select any node for its responsibility, inputs, outputs, and guarantees.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="3-system-architecture" label="§3 System architecture" />
          </>
        }
      />

      <div className="arch-tabs" role="tablist" aria-label="Architecture views">
        {ARCH_VIEWS.map((v) => {
          const Icon = VIEW_ICONS[v.id] ?? Boxes
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={v.id === viewId}
              className={`arch-tab${v.id === viewId ? ' is-active' : ''}`}
              onClick={() => {
                setViewId(v.id)
                setSelected(null)
              }}
            >
              <Icon size={15} aria-hidden="true" /> {v.label}
            </button>
          )
        })}
      </div>

      <p className="arch-blurb" id={`blurb-${view.id}`}>
        {view.blurb}
      </p>

      <div className="arch-layout">
        <div className="arch-canvas">
          <DiagramCanvas
            view={view}
            selectedId={selected}
            onSelect={(id) => setSelected(id)}
            ariaLabel={`${view.title} diagram — select a node for details`}
          />
          <DiagramLegend
            items={[
              { color: 'var(--acc-cyan)', label: 'Retrieval & indexing' },
              { color: 'var(--acc-violet)', label: 'Agent & reasoning' },
              { color: 'var(--acc-amber)', label: 'Pipeline / evaluation / decisions' },
              { color: 'var(--acc-green)', label: 'Validation & enforcement' },
              { color: 'var(--text-muted)', label: 'Infrastructure & clients' },
            ]}
          />
          <p className="canvas-hint">
            {window.matchMedia('(max-width: 699px)').matches ? 'Tap a card to inspect it.' : 'Click a node — or Tab to them and press Enter.'}
          </p>
        </div>
        <aside className="arch-panel" aria-live="polite" aria-label="Selected component detail">
          {node ? (
            <>
              <p className={`arch-panel__kicker arch-panel__kicker--${node.topic}`}>{kickerFor(node.topic)}</p>
              <h3 className="arch-panel__title">{node.label}</h3>
              {node.sub ? <p className="arch-panel__sub">{node.sub}</p> : null}
              <p className="arch-panel__summary">{node.summary}</p>
              {node.inputs.length ? (
                <div className="arch-panel__block">
                  <h4>Inputs</h4>
                  <ul>
                    {node.inputs.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {node.outputs.length ? (
                <div className="arch-panel__block">
                  <h4>Outputs</h4>
                  <ul>
                    {node.outputs.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {node.guarantees?.length ? (
                <div className="arch-panel__block arch-panel__block--ok">
                  <h4>Guarantees</h4>
                  <ul>
                    {node.guarantees.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="arch-panel__meta">
                <span className="arch-panel__stage">
                  <Database size={12} aria-hidden="true" /> {node.stage}
                </span>
                {node.srcRef.id ? <SourceReference id={node.srcRef.id} label={node.srcRef.label} /> : null}
              </div>
            </>
          ) : (
            <div className="arch-panel__empty">
              <ArrowDown size={18} aria-hidden="true" />
              <p>
                Nothing selected yet.
                <br />
                Select a component to see its responsibility, inputs, outputs, dependencies, and where the plan defines it.
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="band" aria-labelledby="profiles-band">
        <h2 id="profiles-band" className="band__title">
          Profiles: the same pipeline, swapped parts
        </h2>
        <p className="band__lead">
          Every collection runs the same stages — Connector, Parser, Segmenter, Enricher, Indexers, Link extractors. A{' '}
          <strong>profile</strong> is a named bundle of those parts plus retrieval settings and tools. New data types
          usually mean a new combination of existing parts.
        </p>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Profile</th>
                <th scope="col">Segmenter</th>
                <th scope="col">Indexes</th>
                <th scope="col">Collection-specific tools</th>
                <th scope="col">Delivered in</th>
                <th scope="col">Used by</th>
              </tr>
            </thead>
            <tbody>
              {PROFILE_MATRIX.map((row) => (
                <tr key={row.profile} className={row.status === 'deferred' ? 'is-deferred' : undefined}>
                  <th scope="row">
                    <code>{row.profile}</code>
                  </th>
                  <td>{row.segmenter}</td>
                  <td>{row.indexes}</td>
                  <td>
                    <code>{row.tools}</code>
                  </td>
                  <td>{row.delivered}</td>
                  <td className="muted">{row.usedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">{ALL_TOOLS_NOTE}</p>
        <SourceReference id="pipeline-and-profiles" label="§3 Pipeline and profiles" />
      </section>

      <section className="band" aria-labelledby="why-band">
        <h2 id="why-band" className="band__title">
          Why the architecture looks like this
        </h2>
        <p className="band__lead">
          Nine key decisions carry the design — each links to its full record.
        </p>
        <div className="grid grid--decisions">
          {KEY_DECISIONS.slice(0, 6).map((d) => (
            <article className="mini-decision" key={d.id}>
              <h3>{d.decision}</h3>
              <p className="mini-decision__choice">{d.choice}</p>
              <p className="mini-decision__why">{d.why}</p>
              <SourceReference id={d.srcRef.id} label={d.srcRef.label} />
            </article>
          ))}
        </div>
        <Callout tone="info">
          The full trade-off analysis — alternatives, costs, and deferred options — lives on the{' '}
          <button type="button" className="inline-link" onClick={() => (window.location.hash = '/decisions')}>
            decision record
          </button>
          .
        </Callout>
      </section>
    </article>
  )
}
