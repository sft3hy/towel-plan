import { PageHeader, StatusLabel, SourceReference, Callout } from '../components/ui'
import { RoadmapGraph } from '../components/diagram/RoadmapGraph'
import { PHASES, STAGES } from '../content/stages'
import { navigate } from '../lib/router'

/** RoadmapPage — dependency-true graph + full stage table + gates. */
export function RoadmapPage() {
  return (
    <article>
      <PageHeader
        eyebrow="Implementation roadmap"
        title="Stages 0 → 15, gates between every phase"
        lead={
          <>
            Each stage is a self-contained assignment for one coding agent; the next starts only when the previous
            stage’s gate passes. The graph below shows the plan’s real dependencies — including the one parallel band where
            separate agents can work at once — not a falsely linear chain.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="7-how-to-run-this-plan" label="§7 How to run this plan" />
            <SourceReference id="8-dependency-map-risks-and-budgets" label="§8 Dependency map" />
          </>
        }
      />

      <div className="rmwrap">
        <RoadmapGraph />
      </div>
      <p className="canvas-hint">Click any stage for its full card: purpose, build items, contracts, deliverables, acceptance tests, and pitfalls.</p>

      <section className="band" aria-labelledby="phase-detail">
        <h2 id="phase-detail" className="band__title">
          Phases, stage by stage
        </h2>
        {PHASES.map((ph) => (
          <div className="phase-block" key={ph.id}>
            <div className={`phase-block__head phase-block__head--${ph.id}`}>
              <h3>{ph.label}</h3>
              <p>{ph.blurb}</p>
            </div>
            <div className="tablewrap">
              <table className="dtable dtable--roadmap">
                <thead>
                  <tr>
                    <th scope="col">Stage</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Depends on</th>
                    <th scope="col">A human can see</th>
                    <th scope="col">Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {STAGES.filter((s) => s.phase === ph.id).map((s) => (
                    <tr key={s.n}>
                      <th scope="row">
                        <button type="button" className="stage-link" onClick={() => navigate(`/stage/${s.n}`)}>
                          <span className={`stage-chip stage-chip--${s.topic}`}>{s.n}</span>
                          {s.name}
                        </button>
                      </th>
                      <td>{stagePurpose(s.n)}</td>
                      <td>
                        {s.dependsLabel ?? (s.dependsOn.length ? s.dependsOn.map((d) => (
                          <button key={d} type="button" className="dep-link" onClick={() => navigate(`/stage/${d}`)}>
                            {d}
                          </button>
                        )) : '—')}
                      </td>
                      <td dangerouslySetInnerHTML={{ __html: s.visible.replace(/`([^`]+)`/g, '<code>$1</code>') }} />
                      <td>
                        <code>{s.gate}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <Callout tone="info" title="Hand-off protocol — every stage">
        Acceptance tests are written first and must fail before implementation. Agents stay inside scope; a frozen-contract
        change stops the agent, produces <code>CONTRACT_CHANGE.md</code>, and flags human review. <code>make gate-N</code> runs
        the full regression of markers stage_0…stage_N — no skipping, xfail-ing, or deleting tests to pass. Each stage ships{' '}
        <code>docs/stages/STAGE_N_REPORT.md</code> with measured numbers the next stage depends on, and is tagged only when CI
        is green.
      </Callout>
      <SourceReference id="stage-card-format" label="§7 Stage card format" />
    </article>
  )
}

function stagePurpose(n: number): string {
  const map: Record<number, string> = {
    0: 'Fully wired but empty repository: CI proves the toolchain, a real Postgres container runs, and planted fixtures seed every later test.',
    1: 'Every shared type, Protocol, config model, registry, and validator — plus deterministic fakes. Nothing touches the database.',
    2: 'Schema, repositories, and row-level security make cross-app and cross-ACL leakage impossible by construction.',
    3: 'Reliable ingestion: parse → segment → enrich → index with incremental sync, deletion reconciliation, and failure isolation.',
    4: 'grep / glob / read / ranked keyword search over every collection — the exact-match foundation, from document bodies.',
    5: 'Dense retrieval + RRF fusion + metadata filters behind one scoped QueryService; the isolation harness is born here.',
    6: 'Bounded agent loop, config-generated tools, evidence ledger, citation validator, injection hygiene — cited answers end to end.',
    7: 'Prose with structure: heading trees, outline tools, contextual prefixes; upload + Confluence connectors.',
    8: 'Code first-class: trigram grep, AST chunks, symbol index, code tokenizer, secret redaction, GitLab incremental sync.',
    9: 'Chat at conversation level: one document per thread, optional Q&A distillation, DMs never ingested.',
    10: 'Tickets by meaning and structure with typed attribute filters; links captured for the graph.',
    11: 'Lightweight regex-extracted link graph — chat → ticket → MR → runbook — traversal ≤ depth 2, expansion off by default.',
    12: 'Rerank, first-move decomposition, deterministic routing, bounded authority/recency — every feature a measurable flag.',
    13: 'Golden sets, recall/MRR/nDCG, judged answer metrics, calibrated judge, ablations, ANN health, regression gates.',
    14: 'API + identity, webhooks + observability, drag-and-drop UI, and the YAML-only second-app onboarding that proves the thesis.',
    15: 'Extensions gated on evidence: visual docs, entity graphs, silo isolation, SCIP references, MRs, new connectors.',
  }
  return map[n] ?? ''
}
