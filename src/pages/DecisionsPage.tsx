import { useState } from 'react'
import { PageHeader, StatusLabel, SourceReference, Callout } from '../components/ui'
import { KEY_DECISIONS, DEFERRED_DECISIONS, OPEN_QUESTIONS, RISK_REGISTER, STACK_ROWS, STACK_NOTE, type Decision } from '../content/decisions'
import { TOPIC_LABEL } from '../content/stages'

/** DecisionsPage — structured decision record with trade-offs, deferrals,
 *  open questions, and the full risk register. */
export function DecisionsPage() {
  const [open, setOpen] = useState<string | null>('primitives')
  return (
    <article>
      <PageHeader
        eyebrow="Technical decision record"
        title="Choices, alternatives, costs — and the honest unknowns"
        lead={
          <>
            Nine headline decisions, seven deferred-to-measurement choices, ten questions that need a human answer, and
            an eleven-row risk register. Where the plan itself states alternatives and costs, they are recorded; where it
            doesn’t, the field is omitted rather than invented.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="3-system-architecture" label="§3 Key decisions" />
            <SourceReference id="9-open-questions-and-deferred-decisions" label="§9 Open questions" />
          </>
        }
      />

      <section className="band" aria-labelledby="keydec-band">
        <h2 id="keydec-band" className="band__title">Key decisions</h2>
        <div className="decisionlist">
          {KEY_DECISIONS.map((d) => (
            <DecisionRow key={d.id} d={d} open={open === d.id} onToggle={() => setOpen(open === d.id ? null : d.id)} />
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="defer-band">
        <h2 id="defer-band" className="band__title">Decisions deferred to measurement</h2>
        <p className="band__lead">Deliberately unsettled — Stage 13 decides, not taste.</p>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Decision</th>
                <th scope="col">Default / until</th>
              </tr>
            </thead>
            <tbody>
              {DEFERRED_DECISIONS.map((r) => (
                <tr key={r.decision}>
                  <th scope="row">{r.decision}</th>
                  <td>{r.until}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="decisions-deferred-to-measurement" label="§9 Deferred" />
      </section>

      <section className="band" aria-labelledby="openq-band">
        <h2 id="openq-band" className="band__title">Ten questions that need an answer</h2>
        <div className="grid grid--questions">
          {OPEN_QUESTIONS.map((q) => (
            <article className="question" key={q.n}>
              <span className="question__num">Q{q.n}</span>
              <h3>{q.q}</h3>
              <p className="question__why">{q.why}</p>
              <StatusLabel kind="open-question" label={`Needed by ${q.needed}`} />
            </article>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="risk-band">
        <h2 id="risk-band" className="band__title">Risk register</h2>
        <div className="tablewrap">
          <table className="dtable dtable--risk">
            <thead>
              <tr>
                <th scope="col">Risk</th>
                <th scope="col">L</th>
                <th scope="col">I</th>
                <th scope="col">Mitigation</th>
                <th scope="col">Where</th>
              </tr>
            </thead>
            <tbody>
              {RISK_REGISTER.map((r) => (
                <tr key={r.risk}>
                  <th scope="row">{r.risk}</th>
                  <td><span className={`llm llm--${r.likelihood.toLowerCase()}`}>{r.likelihood[0]}</span></td>
                  <td><span className={`llm llm--${r.impact.toLowerCase()}`}>{r.impact[0]}</span></td>
                  <td>{r.mitigation}</td>
                  <td className="muted">{r.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="risk-register" label="§8 Risk register" />
      </section>

      <section className="band" aria-labelledby="stack-band">
        <h2 id="stack-band" className="band__title">Stack recommendations</h2>
        <Callout tone="info" title="Recommendations, not findings">{STACK_NOTE}</Callout>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Concern</th>
                <th scope="col">Choice</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {STACK_ROWS.map((r) => (
                <tr key={r.concern}>
                  <th scope="row">{r.concern}</th>
                  <td><code>{r.choice}</code></td>
                  <td className="muted">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="4-tech-stack-repo-layout-and-conventions" label="§4 Tech stack" />
      </section>
    </article>
  )
}

function DecisionRow({ d, open, onToggle }: { d: Decision; open: boolean; onToggle: () => void }) {
  return (
    <div className={`decision${open ? ' is-open' : ''}`}>
      <button type="button" className="decision__head" aria-expanded={open} onClick={onToggle}>
        <span className="decision__plus" aria-hidden="true">{open ? '−' : '+'}</span>
        <span className="decision__title">{d.decision}</span>
        <span className="decision__choice">{d.choice}</span>
      </button>
      <div className="decision__body" hidden={!open}>
        <div className="decision__grid">
          <div>
            <h4>Why</h4>
            <p>{d.why}</p>
          </div>
          {d.alternatives ? (
            <div>
              <h4>Alternatives considered</h4>
              <p>{d.alternatives}</p>
            </div>
          ) : null}
          {d.costs ? (
            <div>
              <h4>Costs / risks</h4>
              <p>{d.costs}</p>
            </div>
          ) : null}
          {d.deferred ? (
            <div>
              <h4>Deferred</h4>
              <p>{d.deferred}</p>
            </div>
          ) : null}
        </div>
        <div className="decision__foot">
          <span className="decision__topic">{TOPIC_LABEL.quality}</span>
          <SourceReference id={d.srcRef.id} label={d.srcRef.label} />
        </div>
      </div>
    </div>
  )
}
