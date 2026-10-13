import { PageHeader, StatusLabel, SourceReference, Callout, CodeBlock } from '../components/ui'
import { RETRIEVAL_STACK, RRF_EXAMPLE, RESEARCH_FIGURES, RESEARCH_COST_POINTS, SEGMENTATION_ROWS } from '../content/retrieval'
import { VFS_EXAMPLES } from '../content/dataModel'
import { navigate } from '../lib/router'

/** RetrievalPage — the layered stack, a worked RRF example, and the
 *  research figures with their provenance kept intact. */
export function RetrievalPage() {
  return (
    <article>
      <PageHeader
        eyebrow="Search & indexing"
        title="Day one: grep. Then layers, earned by eval."
        lead={
          <>
            Every collection is searchable by grep, glob, read, and ranked keyword search on day one through the virtual
            filesystem — before embeddings or rerankers exist for it. Semantic layers, structure, and graphs stack on top,
            each behind an interface and each measured before it stays on.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="virtual-filesystem" label="§3 Virtual filesystem" />
            <SourceReference id="2-research-findings-that-drive-the-design" label="§2 Research map" />
          </>
        }
      />

      <section className="rstack" aria-label="Retrieval stack, bottom to top">
        {RETRIEVAL_STACK.map((layer, i) => (
          <div key={layer.id} className={`rstack__layer rstack__layer--${layer.color}${layer.status === 'deferred' ? ' is-deferred' : ''}`}>
            <div className="rstack__side">
              <span className="rstack__idx">{RETRIEVAL_STACK.length - i}</span>
              <span className={`rstack__badge rstack__badge--${layer.status}`}>
                {layer.status === 'day-one' ? 'Day one' : layer.status === 'stage' ? layer.stage.split('·')[0].trim() : layer.status === 'flag' ? 'Flag-gated' : 'Deferred'}
              </span>
            </div>
            <div className="rstack__main">
              <h3 className="rstack__label">{layer.label}</h3>
              <p>{layer.body}</p>
              <div className="rstack__tools">
                {layer.tools.map((t) => (
                  <code key={t}>{t}</code>
                ))}
              </div>
            </div>
            <div className="rstack__ref">
              <span className="rstack__stage">{layer.stage}</span>
              <SourceReference id={layer.srcRef.id} label={layer.srcRef.label} />
            </div>
          </div>
        ))}
      </section>

      <section className="band" aria-labelledby="vfs-band">
        <h2 id="vfs-band" className="band__title">
          One filesystem, every collection
        </h2>
        <p className="band__lead">
          grep, glob, read, and ls behave identically across all collections — including ones that don’t exist yet. That
          uniformity is why any new collection is useful on day one.
        </p>
        <div className="vfs">
          <div className="vfs__tree" role="tree" aria-label="Example virtual filesystem">
            <p className="vfs__root">/</p>
            {VFS_EXAMPLES.map((v) => {
              const parts = v.path.split('/').filter(Boolean)
              return (
                <div key={v.path} className="vfs__row">
                  <div className="vfs__path">
                    {parts.map((p, i) => (
                      <span key={`${v.path}-${i}`} className={i === parts.length - 1 ? 'vfs__file' : 'vfs__dir'}>
                        {i === parts.length - 1 ? `${p} ` : `${p}/`}
                      </span>
                    ))}
                  </div>
                  <span className="vfs__note">{v.note}</span>
                </div>
              )
            })}
          </div>
          <div className="vfs__code">
            <CodeBlock
              lang="bash"
              code={`$ towel grep --app ctrl-f --as ada@co.io \\
    -c --regex 'get_?[Uu]ser_?[Bb]y_?[Ii][Dd]' --path '**/*.py'
# trigram prefilter narrows candidate documents,
# then an RE2 engine extracts exact line matches —
# a hostile pattern like (a+)+$ cannot hang it.

$ towel search --app ctrl-f 'why is the pool resetting' \\
    --mode hybrid --explain
# lexical + dense, 50 candidates each, fused by RRF,
# provenance per hit, rendered under a token budget.`}
            />
            <p className="note">Illustrative CLI shapes from the plan’s stage specs — not executed output.</p>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="rrf-band">
        <h2 id="rrf-band" className="band__title">
          Fusion without fantasy: RRF on ranks
        </h2>
        <p className="band__lead">
          Lexical scores and cosine similarities are not comparable, so they are never summed. Reciprocal rank fusion turns
          each list into ranks — score = Σ 1/(k + rank), k = 60 — and merges deterministically.
        </p>
        <RrfDiagram />
        <StatusLabel kind="illustrative" label="Illustrative example — not a measured result" />
        <SourceReference id="stage-5-embeddings-hybrid-retrieval-and-the-scoped-query-service" label="Stage 5 Fusion" />
      </section>

      <section className="band" aria-labelledby="research-band">
        <h2 id="research-band" className="band__title">
          What the research showed
        </h2>
        <p className="band__lead">
          Quoted from §2 with provenance preserved. These figures come from secondary write-ups and vendor reports gathered
          in October 2026 — directional, not Towel’s data. Stage 13 confirms everything on the real corpus.
        </p>
        <div className="grid grid--figures">
          {RESEARCH_FIGURES.map((f) => (
            <figure className="fig" key={f.id}>
              <BarChart
                points={f.points}
                unit={f.unit}
                invertBetter={f.invertBetter}
              />
              <figcaption>
                <h3>{f.title}</h3>
                <p className="fig__prov">
                  <StatusLabel kind="vendor-reported" label={f.provenance.startsWith('Anthropic') ? 'Anthropic-reported · directional' : 'Benchmark-reported · directional'} />
                </p>
                <p>{f.takeaway}</p>
                <p className="fig__decision">
                  <strong>Towel’s decision:</strong> {f.decision} <span className="muted">({f.stage})</span>
                </p>
                <SourceReference id={f.srcRef.id} label={f.srcRef.label} />
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="costgrid">
          {RESEARCH_COST_POINTS.map((c) => (
            <div className="costcard" key={c.label}>
              <p className="costcard__value">{c.value}</p>
              <p className="costcard__label">{c.label}</p>
              <p className="costcard__detail">{c.detail}</p>
            </div>
          ))}
        </div>
        <Callout tone="warn" title="Read numbers as direction, not as promises">
          A May 2026 LongMemEval study (116 questions) found grep generally beat vector retrieval across agent harnesses —
          but results depended strongly on harness and tool-calling style. That is exactly why every number above only
          justifies a <em>shape</em> of architecture, and the numbers that matter will be measured in Stage 13.
        </Callout>
      </section>

      <section className="band" aria-labelledby="seg-band">
        <h2 id="seg-band" className="band__title">
          Segmentation is per-source, by construction
        </h2>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Profile</th>
                <th scope="col">Unit boundaries</th>
                <th scope="col">Defaults</th>
                <th scope="col">Locator fields</th>
                <th scope="col">Evidence</th>
                <th scope="col">Stage</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTATION_ROWS.map((r) => (
                <tr key={r.profile}>
                  <th scope="row">
                    <code>{r.profile}</code>
                  </th>
                  <td>{r.unit}</td>
                  <td className="muted">{r.defaults}</td>
                  <td>
                    <code>{r.locator}</code>
                  </td>
                  <td className="muted">{r.evidence}</td>
                  <td>
                    <button type="button" className="stage-chip stage-chip--profile" onClick={() => navigate(`/stage/${r.stage.match(/\d+/)?.[0] ?? 7}`)}>
                      {r.stage}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="2-research-findings-that-drive-the-design" label="§2 Research map" />
      </section>
    </article>
  )
}

// ---------------------------------------------------------------------------
// RRF worked example diagram (HTML/CSS columns with computed contributions)
// ---------------------------------------------------------------------------

function RrfDiagram() {
  const ex = RRF_EXAMPLE
  const max = 0.033
  return (
    <div className="rrf" role="img" aria-label={`Reciprocal rank fusion example for query ${ex.query}: lexical and dense ranked lists fused with k=60`}>
      <div className="rrf__col">
        <h4>{ex.lexical.name}</h4>
        {ex.lexical.hits.map((h, i) => (
          <div key={h.id} className="rrf__hit rrf__hit--lexical">
            <span className="rrf__rank">{i + 1}</span>
            <div>
              <code className="rrf__doc">{h.doc}</code>
              <span className="rrf__contrib">+1/{60 + i + 1} = {(1 / (60 + i + 1)).toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rrf__plus" aria-hidden="true">
        <span>RRF<br />k=60</span>
      </div>
      <div className="rrf__col">
        <h4>{ex.dense.name}</h4>
        {ex.dense.hits.map((h, i) => (
          <div key={h.id} className="rrf__hit rrf__hit--dense">
            <span className="rrf__rank">{i + 1}</span>
            <div>
              <code className="rrf__doc">{h.doc}</code>
              <span className="rrf__contrib">+1/{60 + i + 1} = {(1 / (60 + i + 1)).toFixed(4)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="rrf__arrow" aria-hidden="true">→</div>
      <div className="rrf__col rrf__col--fused">
        <h4>Fused order</h4>
        {ex.fused.map((h, i) => (
          <div key={h.id} className="rrf__hit rrf__hit--fused">
            <span className="rrf__rank">{i + 1}</span>
            <div className="rrf__fusedbody">
              <code className="rrf__doc">{h.id} · {h.score}</code>
              <span className="rrf__bar"><i style={{ width: `${Math.min(100, (parseFloat(h.score.split('=')[1]) / max) * 100)}%` }} /></span>
              <span className="rrf__why">{h.why}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tiny horizontal bar chart — used only for numbers the plan quotes.
// ---------------------------------------------------------------------------

export function BarChart({
  points,
  unit,
  invertBetter,
}: {
  points: Array<{ label: string; value: number; note?: string }>
  unit: string
  invertBetter?: boolean
}) {
  const max = Math.max(...points.map((p) => p.value)) * 1.15
  return (
    <div className="barchart" role="img" aria-label={`${unit}: ${points.map((p) => `${p.label} ${p.value}`).join(', ')}`}>
      <p className="barchart__unit">
        {unit}
        {invertBetter ? ' · shown relative, lower is better' : ''}
      </p>
      {points.map((p, i) => (
        <div className="barchart__row" key={p.label}>
          <span className="barchart__label">{p.label}</span>
          <span className="barchart__track">
            <i
              className={`barchart__bar barchart__bar--${i % 2 === 0 ? 'a' : 'b'}`}
              style={{ width: `${(p.value / max) * 100}%` }}
            />
          </span>
          <span className="barchart__value">
            {p.value}
            {p.note ? <em> {p.note}</em> : null}
          </span>
        </div>
      ))}
    </div>
  )
}
