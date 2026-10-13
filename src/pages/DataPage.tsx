import { useState } from 'react'
import { PageHeader, StatusLabel, SourceReference, Callout, CodeBlock } from '../components/ui'
import {
  ENTITIES,
  DATA_RULES,
  PROFILE_MATRIX,
  CTRLF_COLLECTIONS,
  CTRLF_TRUST_ORDER,
  APP2_COLLECTIONS,
  APP2_NOTE,
  LOCATOR_ROWS,
  ONBOARDING_RECIPES,
} from '../content/dataModel'

const CTRLF_YAML = `# apps/ctrl-f.yaml (abridged — full text in §6)
app: ctrl-f
isolation: pool            # silo reserved; rejected by the v1 validator
agent:
  model: claude-sonnet-5-5
  max_steps: 12
  max_tool_tokens: 40000
  trust_order: [gitlab, knowledge_doc, confluence, jira, chat]
  routing_hints:
    - when: identifier-shaped query
      prefer: [grep, find_symbol]
    - when: how-do-I or runbook question
      prefer: [confluence, knowledge_doc]
    - when: why-did-we, decision, or incident history
      prefer: [chat, jira]
collections:
  gitlab:        { profile: code,          connector: gitlab }
  confluence:    { profile: structured_doc, connector: confluence, enrich: [contextual_prefix] }
  jira:          { profile: ticket,        connector: jira }
  chat:          { profile: thread,        connector: slack, enrich: [qa_distill] }
  knowledge_doc: { profile: structured_doc, connector: upload }`

/** DataPage — entities, invariants, profiles, both apps, locators, recipes. */
export function DataPage() {
  const [focus, setFocus] = useState<string | null>(null)
  const focused = ENTITIES.find((e) => e.id === focus)

  return (
    <article>
      <PageHeader
        eyebrow="Data model & collection profiles"
        title="Two retrievable levels. Side indexes. Scope on every row."
        lead={
          <>
            Every row that can be retrieved carries <code>app_id</code> and <code>collection_id</code>, so row-level
            security and per-collection indexes apply without joins. Documents own full text in{' '}
            <code>document_bodies</code> so grep and line-accurate reads never reconstruct text from overlapping units.
          </>
        }
        chips={
          <>
            <StatusLabel kind="defined" />
            <SourceReference id="5-data-model" label="§5 Data model" />
          </>
        }
      />

      <section className="entitymap" aria-label="Entity relationship map">
        <div className="entitymap__core">
          <button type="button" className={`ent ent--violet${focus === 'apps' ? ' is-active' : ''}`} onClick={() => setFocus(focus === 'apps' ? null : 'apps')}>
            apps
            <small>tenant boundary</small>
          </button>
          <span className="ent__rel">1 ─ n</span>
          <button type="button" className={`ent ent--cyan${focus === 'collections' ? ' is-active' : ''}`} onClick={() => setFocus(focus === 'collections' ? null : 'collections')}>
            collections
            <small>one profile · one source</small>
          </button>
          <span className="ent__rel">1 ─ n</span>
          <button type="button" className={`ent ent--amber${focus === 'documents' ? ' is-active' : ''}`} onClick={() => setFocus(focus === 'documents' ? null : 'documents')}>
            documents
            <small>vpath · acl · hash</small>
          </button>
          <span className="ent__rel">1 ─ n</span>
          <button type="button" className={`ent ent--green${focus === 'units' ? ' is-active' : ''}`} onClick={() => setFocus(focus === 'units' ? null : 'units')}>
            units
            <small>locator = citation</small>
          </button>
        </div>
        <div className="entitymap__sides">
          {[
            { e: ENTITIES.find((x) => x.id === 'document_bodies')!, from: 'documents' },
            { e: ENTITIES.find((x) => x.id === 'unit_embeddings')!, from: 'units' },
            { e: ENTITIES.find((x) => x.id === 'symbols')!, from: 'units' },
            { e: ENTITIES.find((x) => x.id === 'outline_nodes')!, from: 'documents' },
            { e: ENTITIES.find((x) => x.id === 'links')!, from: 'documents' },
          ].map(({ e, from }) => (
            <button key={e.id} type="button" className={`ent ent--side${focus === e.id ? ' is-active' : ''}`} onClick={() => setFocus(focus === e.id ? null : e.id)}>
              <span className="ent__from">└ {from}</span>
              <code>{e.id}</code>
            </button>
          ))}
        </div>
        <div className="entitymap__ops">
          {ENTITIES.filter((e) => ['sync_state', 'jobs', 'audit_log', 'eval'].includes(e.id)).map((e) => (
            <button key={e.id} type="button" className={`ent ent--ops${focus === e.id ? ' is-active' : ''}`} onClick={() => setFocus(focus === e.id ? null : e.id)}>
              <code>{e.id}</code>
              <small>{e.purpose}</small>
            </button>
          ))}
        </div>
        {focused ? (
          <div className="ent-detail" aria-live="polite">
            <h3>
              <code>{focused.name}</code> — {focused.purpose}
            </h3>
            <div className="ent-cols">
              {focused.keyColumns.map((c) => (
                <code key={c}>{c}</code>
              ))}
            </div>
            {focused.retrievable ? <StatusLabel kind="hard-requirement" label="Retrievable → under RLS, carries app_id + collection_id" /> : <StatusLabel kind="invariant" label="Operational table — outside retrieval path" />}
          </div>
        ) : (
          <p className="canvas-hint">Select a table to inspect its key columns.</p>
        )}
      </section>

      <section className="band" aria-labelledby="rules-band">
        <h2 id="rules-band" className="band__title">
          Rules and invariants
        </h2>
        <div className="grid grid--rules">
          {DATA_RULES.map((r) => (
            <article className={`rule rule--${r.kind}`} key={r.title}>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="band" aria-labelledby="profile-band">
        <h2 id="profile-band" className="band__title">
          Profiles are bundles; collections reference them by name
        </h2>
        <div className="tablewrap">
          <table className="dtable">
            <thead>
              <tr>
                <th scope="col">Profile</th>
                <th scope="col">Segmenter</th>
                <th scope="col">Indexes</th>
                <th scope="col">Tools</th>
                <th scope="col">Delivered</th>
                <th scope="col">Used by</th>
              </tr>
            </thead>
            <tbody>
              {PROFILE_MATRIX.map((row) => (
                <tr key={row.profile} className={row.status === 'deferred' ? 'is-deferred' : undefined}>
                  <th scope="row"><code>{row.profile}</code></th>
                  <td>{row.segmenter}</td>
                  <td>{row.indexes}</td>
                  <td><code>{row.tools}</code></td>
                  <td>{row.delivered}</td>
                  <td className="muted">{row.usedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceReference id="pipeline-and-profiles" label="§3 Pipeline and profiles" />
      </section>

      <section className="band" aria-labelledby="apps-band">
        <h2 id="apps-band" className="band__title">
          Two apps, one engine
        </h2>
        <div className="apps-compare">
          <div className="app-card app-card--ctrlf">
            <h3>ctrl-f</h3>
            <p className="app-card__sub">Engineering knowledge search · trust order:</p>
            <ol className="trust">
              {CTRLF_TRUST_ORDER.map((c, i) => (
                <li key={c}>
                  <span className="trust__rank">{i + 1}</span>
                  <code>{c}</code>
                </li>
              ))}
            </ol>
            <ul className="coll-list">
              {CTRLF_COLLECTIONS.map((c) => (
                <li key={c.name}>
                  <div className="coll-list__head">
                    <code className="coll-list__name">{c.name}</code>
                    <code className="coll-list__profile">{c.profile}</code>
                  </div>
                  <p>{c.description}</p>
                  <p className="coll-list__src">{c.connector}</p>
                  {c.extras.map((x) => (
                    <span key={x} className="coll-list__extra">{x}</span>
                  ))}
                </li>
              ))}
            </ul>
            <StatusLabel kind="defined" label="Defined in plan" />
          </div>
          <div className="app-card app-card--app2">
            <h3>app-2</h3>
            <p className="app-card__sub">Extensibility proof · logical separation only</p>
            <ul className="coll-list">
              {APP2_COLLECTIONS.map((c) => (
                <li key={c.name}>
                  <div className="coll-list__head">
                    <code className="coll-list__name">{c.name}</code>
                    <code className="coll-list__profile">{c.profile}</code>
                  </div>
                  <p>{c.description}</p>
                </li>
              ))}
            </ul>
            <p className="app-card__note">{APP2_NOTE}</p>
            <StatusLabel kind="illustrative" label="Illustrative config — profile assignments to confirm" />
          </div>
        </div>
        <CodeBlock lang="yaml" code={CTRLF_YAML} />
        <SourceReference id="app-definition-ctrl-f" label="§6 ctrl-f YAML" />
      </section>

      <section className="band" aria-labelledby="loc-band">
        <h2 id="loc-band" className="band__title">
          Locators: the citation anchor per profile
        </h2>
        <div className="locgrid">
          {LOCATOR_ROWS.map((r) => (
            <div className="loccard" key={r.profile}>
              <h3><code>{r.profile}</code></h3>
              <p>{r.fields}</p>
            </div>
          ))}
        </div>
        <SourceReference id="locator-shapes-by-profile" label="§5 Locator shapes" />
      </section>

      <section className="band" aria-labelledby="onboard-band">
        <h2 id="onboard-band" className="band__title">
          Configuration-driven onboarding
        </h2>
        <div className="recipes">
          {ONBOARDING_RECIPES.map((r, i) => (
            <div className="recipe" key={r.change}>
              <span className="recipe__num">{i + 1}</span>
              <div>
                <h3>{r.change}</h3>
                <p>{r.work}</p>
                <StatusLabel kind={r.code === 'No code' ? 'invariant' : 'stage'} label={r.code} />
              </div>
            </div>
          ))}
        </div>
        <Callout tone="ok" title="Validation is part of onboarding">
          Unknown names error with the valid list; <code>apply</code> refuses planned components and names the stage that
          delivers them; <code>--plan</code> prints exactly what would be rebuilt before anything runs; changing profile,
          segmenter, enrichers, or embedding model marks the collection for reindex.
        </Callout>
        <SourceReference id="validation-rules-enforced-at-load-and-at-apply" label="§6 Validation rules" />
      </section>
    </article>
  )
}
