import { PageHeader, StatusLabel, SourceReference, Callout } from '../components/ui'
import { DiagramCanvas } from '../components/diagram/Canvas'
import { EVAL_VIEW } from '../content/architecture'
import { EVAL_FAMILIES, TARGET_ROWS, GOLDEN_SCHEMA_ROWS, ABLATION_FLAGS, HYGIENE } from '../content/eval'
import { useState } from 'react'

/** EvaluationPage — the scorecard of everything the plan promises to measure.
 *  Nothing on this page is a measured result; every figure is a target or a
 *  harness structure. */
export function EvaluationPage() {
  const [selected, setSelected] = useState<string | null>('gate')
  const node = EVAL_VIEW.nodes.find((n) => n.id === selected)

  return (
    <article>
      <PageHeader
        eyebrow="Evaluation & acceptance criteria"
        title="A harness, golden sets, and a gate that says no"
        lead={
          <>
            Every open decision — reranker, chunk sizes, chat distillation, link expansion, and the embedder’s truncation level — is settled by
            measurement, not opinion. Retrieval metrics run without an LLM on every commit; judged answer metrics run the
            real stack; regressions fail CI.
          </>
        }
        chips={
          <>
            <StatusLabel kind="proposed-target" label="Targets only — no measured results exist yet" />
            <SourceReference id="stage-13-eval-harness-and-golden-sets" label="Stage 13" />
          </>
        }
      />

      <div className="eval-empty" role="note">
        <span className="eval-empty__big">—</span>
        <p>
          There are no live metrics on this site on purpose. The plan says so explicitly: figures in §2 are directional,
          vendor-reported, and “Stage 13 exists to validate every choice on Towel’s own data.” When numbers exist, they
          live in <code>docs/stages/STAGE_N_REPORT.md</code> and <code>evals/baselines/stage13.json</code>.
        </p>
      </div>

      <section className="band" aria-labelledby="family-band">
        <h2 id="family-band" className="band__title">
          Six metric families
        </h2>
        <div className="grid grid--eval">
          {EVAL_FAMILIES.map((f) => (
            <article className={`evalcard evalcard--${f.color}`} key={f.id}>
              <h3>{f.title}</h3>
              <p className="evalcard__metric">{f.metric}</p>
              <p>{f.detail}</p>
              <StatusLabel kind={f.requiresLLM ? 'stage' : 'invariant'} label={f.requiresLLM ? 'Judged · live mode' : 'Deterministic · CI-cheap'} />
            </article>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="targets-band">
        <h2 id="targets-band" className="band__title">
          Targets ledger
        </h2>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Target</th>
                <th scope="col">Measured in</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {TARGET_ROWS.map((r) => (
                <tr key={r.metric}>
                  <th scope="row">{r.metric}</th>
                  <td><code>{r.target}</code></td>
                  <td className="muted">{r.measured}</td>
                  <td><StatusLabel kind={r.kind} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="budgets-and-targets" label="§8 Budgets & targets" />
      </section>

      <section className="band" aria-labelledby="golden-band">
        <h2 id="golden-band" className="band__title">
          The golden set, field by field
        </h2>
        <div className="golden">
          <div className="golden__fields">
            {GOLDEN_SCHEMA_ROWS.map((g) => (
              <div className="golden__field" key={g.field}>
                <code>{g.field}</code>
                <p>{g.desc}</p>
              </div>
            ))}
          </div>
          <div className="golden__flow">
            <h3>How questions enter the set</h3>
            <ol className="pipeline-list">
              <li>Stage 0 plants <code>planted_facts.yaml</code> — invented facts with expected doc + locator.</li>
              <li>Stage 13 seeds the CI golden set from planted facts; schema validation rejects malformed files.</li>
              <li><code>towel evals mine-chat</code> harvests resolved Q&amp;A threads (linked to a ticket or doc) into candidates — dated, because chat answers age.</li>
              <li>Human review accepts or rejects; accepted items merge with a version bump.</li>
              <li>30% held-out split is reserved for final decisions. Internal golden sets stay out of the public repo — and out of every prompt that builds the system.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="ablation-band">
        <h2 id="ablation-band" className="band__title">
          The ablation matrix — flags earn their place
        </h2>
        <p className="band__lead">
          The runner sweeps every configured variant. Any flag that lowers top-3 hit rate by more than 2 points against the
          Stage 11 baseline defaults off. <code>--explain</code> shows every component of the final score.
        </p>
        <div className="ablation">
          {ABLATION_FLAGS.map((f, i) => (
            <div key={f.flag} className={`ablation__row${i <= 2 ? ' ablation__row--base' : ''}`}>
              <span className="ablation__stack">
                {ABLATION_FLAGS.slice(0, i + 1).map((acc, j) => (
                  <span key={acc.flag} className={`ablation__block${j === i ? ' is-new' : ''}`} title={acc.note} />
                ))}
              </span>
              <code className="ablation__flag">{f.flag}</code>
              <span className="ablation__note">{f.note}</span>
            </div>
          ))}
        </div>
        <StatusLabel kind="illustrative" label="Stack diagram shows the matrix, not its results" />
      </section>

      <section className="band" aria-labelledby="harness-band">
        <h2 id="harness-band" className="band__title">
          The harness, connected
        </h2>
        <DiagramCanvas view={EVAL_VIEW} selectedId={selected} onSelect={setSelected} ariaLabel="Evaluation harness workflow" />
        {node ? (
          <div className="sec-detail" aria-live="polite">
            <h3>{node.label}</h3>
            <p>{node.summary}</p>
            <SourceReference id={node.srcRef.id} label={node.srcRef.label} />
          </div>
        ) : null}
      </section>

      <section className="band" aria-labelledby="hygiene-band">
        <h2 id="hygiene-band" className="band__title">
          Dataset & judge hygiene
        </h2>
        <ul className="checklist">
          {HYGIENE.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <Callout tone="threat" title="ACL questions are hard failures">
          A question run as an unauthorized principal fails the eval — hard — if any restricted source appears in results
          or citations. Negative questions score wrong when the agent answers instead of abstaining.
        </Callout>
      </section>
    </article>
  )
}
