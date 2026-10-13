import { PageHeader, StatusLabel, SourceReference, Callout, CodeBlock } from '../components/ui'
import { DiagramCanvas, DiagramLegend } from '../components/diagram/Canvas'
import { SECURITY_VIEW } from '../content/architecture'
import { ENFORCEMENT_POINTS, RLS_POLICY_SQL, ADVERSARY_EXAMPLE, DEFERRED_ISOLATION, SECURITY_RISKS } from '../content/security'
import { useState } from 'react'

/** SecurityPage — where the boundaries live and what they refuse. */
export function SecurityPage() {
  const [selected, setSelected] = useState<string | null>('rls')
  const node = SECURITY_VIEW.nodes.find((n) => n.id === selected)

  return (
    <article>
      <PageHeader
        eyebrow="Security & isolation"
        title="Enforced before retrieval. Never in the prompt."
        lead={
          <>
            The one rule everything else follows: app, collection, and ACL restrictions run <strong>inside the
            database</strong>, before any row is produced. Scope is injected by the platform, missing settings return zero
            rows, unresolvable permissions fail closed, and every retrieval tool must pass an adversarial harness to
            pass its gate.
          </>
        }
        chips={
          <>
            <StatusLabel kind="hard-requirement" label="Zero leakage · every stage" />
            <SourceReference id="2-research-findings-that-drive-the-design" label="§2 Multi-tenancy" />
          </>
        }
      />

      <section className="band" aria-labelledby="chain-band">
        <h2 id="chain-band" className="band__title">
          The enforcement chain
        </h2>
        <p className="band__lead">Six gates, in order. A request only becomes rows if it clears all of them.</p>
        <ol className="enforce">
          {ENFORCEMENT_POINTS.map((p) => (
            <li className="enforce__step" key={p.order}>
              <span className="enforce__num">{p.order}</span>
              <div className="enforce__main">
                <h3>{p.where}</h3>
                <p>{p.what}</p>
                <p className="enforce__fail"><strong>Fails as:</strong> {p.failsHow}</p>
              </div>
              <span className="enforce__stage">{p.stage}</span>
            </li>
          ))}
        </ol>
        <SourceReference id="stage-2-storage-layer-migrations-acl-and-rls" label="Stage 2" />
      </section>

      <section className="band" aria-labelledby="rls-band">
        <h2 id="rls-band" className="band__title">
          The predicate, spelled out
        </h2>
        <div className="rls-layout">
          <CodeBlock lang="sql" code={RLS_POLICY_SQL} />
          <div className="rls-notes">
            <Callout tone="ok" title="Fail closed is the default">
              If <code>towel.app_id</code> or <code>towel.principals</code> are absent, every policy returns zero rows. The
              application role is <code>NOBYPASSRLS</code>, cannot alter policies, and cannot write <code>audit_log</code>.
              <code>SET LOCAL</code> means the settings die with the transaction — and the pooled-connection leak case is a
              named acceptance test.
            </Callout>
            <Callout tone="info" title="Service context is narrow on purpose">
              Ingestion runs under <code>AuthContext.service(app_id)</code>: it bypasses only the ACL half of the
              predicate — never the app boundary — and writing a document with a different app_id raises{' '}
              <code>IsolationError</code>.
            </Callout>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="boundary-band">
        <h2 id="boundary-band" className="band__title">
          Boundaries at a glance
        </h2>
        <DiagramCanvas view={SECURITY_VIEW} selectedId={selected} onSelect={setSelected} ariaLabel="Security boundary diagram" />
        <DiagramLegend
          items={[
            { color: 'var(--acc-green)', label: 'Enforcement (RLS)' },
            { color: 'var(--acc-cyan)', label: 'Scoped query layer' },
            { color: 'var(--acc-violet)', label: 'Agent surface' },
            { color: 'var(--acc-amber)', label: 'Testing & ACLs' },
            { color: 'var(--text-muted)', label: 'Identity & deferred' },
          ]}
        />
        {node ? (
          <div className="sec-detail" aria-live="polite">
            <h3>{node.label}</h3>
            <p>{node.summary}</p>
            {node.guarantees?.length ? (
              <ul>
                {node.guarantees.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : null}
            <SourceReference id={node.srcRef.id} label={node.srcRef.label} />
          </div>
        ) : null}
      </section>

      <section className="band" aria-labelledby="adv-band">
        <h2 id="adv-band" className="band__title">
          An adversarial walkthrough
        </h2>
        <p className="band__lead">
          Labeled example — this is a narrative of the threat model, <strong>not a recorded test result</strong>. The real
          proofs are the automated suites: the Stage 5 isolation harness on every tool, adversarial API suite (14A), the
          DM-ingestion attempt (Stage 9), and the 1,000-request interleave stress test (14D).
        </p>
        <div className="attack" role="img" aria-label={`Illustrative attack walkthrough: ${ADVERSARY_EXAMPLE.attack}`}>
          <div className="attack__ask">
            <span className="attack__tag attack__tag--ask">Request</span>
            <p>“{ADVERSARY_EXAMPLE.attack}”</p>
            <p className="attack__vector">{ADVERSARY_EXAMPLE.vector}</p>
          </div>
          <div className="attack__vs" aria-hidden="true">⚡</div>
          <div className="attack__block">
            <span className="attack__tag attack__tag--defense">Defense</span>
            <p>{ADVERSARY_EXAMPLE.defense}</p>
          </div>
          <div className="attack__out">
            <span className="attack__tag attack__tag--out">Outcome</span>
            <p>{ADVERSARY_EXAMPLE.outcome}</p>
            <span className="attack__stage">{ADVERSARY_EXAMPLE.stage}</span>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="def-band">
        <h2 id="def-band" className="band__title">
          Deferred: the silo seam
        </h2>
        <div className="grid grid--deferred">
          {DEFERRED_ISOLATION.map((d) => (
            <article className="defer-card" key={d.title}>
              <h3>{d.title}</h3>
              <p>{d.body}</p>
              <StatusLabel kind={d.title.startsWith('Deferred') ? 'deferred' : 'invariant'} />
            </article>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="secrisk-band">
        <h2 id="secrisk-band" className="band__title">
          Security rows of the risk register
        </h2>
        <div className="tablewrap">
          <table className="dtable dtable--risk">
            <thead>
              <tr>
                <th scope="col">Risk</th>
                <th scope="col">Likelihood</th>
                <th scope="col">Impact</th>
                <th scope="col">Mitigation</th>
                <th scope="col">Where</th>
              </tr>
            </thead>
            <tbody>
              {SECURITY_RISKS.map((r) => (
                <tr key={r.risk}>
                  <th scope="row">{r.risk}</th>
                  <td><span className={`llm llm--${r.likelihood.toLowerCase()}`}>{r.likelihood}</span></td>
                  <td><span className={`llm llm--${r.impact.toLowerCase()}`}>{r.impact}</span></td>
                  <td>{r.mitigation}</td>
                  <td className="muted">{r.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="risk-register" label="§8 Risk register" />
      </section>
    </article>
  )
}
