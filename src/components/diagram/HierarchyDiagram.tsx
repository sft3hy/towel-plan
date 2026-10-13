import { CTRLF_COLLECTIONS } from '../../content/dataModel'

/**
 * HierarchyDiagram — nested, interactive Platform → App → Collection →
 * Document → Unit. Selecting a level highlights its nest and updates the
 * caption below (rendered by the page).
 */

export function HierarchyDiagram({ active, onSelect }: { active: number; onSelect: (n: number) => void }) {
  return (
    <div className="hier" role="list" aria-label="Platform, App, Collection, Document, Unit hierarchy">
      <button
        type="button"
        role="listitem"
        className={`hier__level hier__level--neutral${active === 0 ? ' is-active' : ''}`}
        onClick={() => onSelect(0)}
        aria-pressed={active === 0}
      >
        <span className="hier__tag">Platform</span>
        <span className="hier__inline">one engine · no app-specific code</span>

        <div className="hier__nest">
          {(['ctrl-f', 'app-2'] as const).map((app, i) => (
            <button
              key={app}
              type="button"
              role="listitem"
              className={`hier__level hier__level--violet hier__app${active === 1 ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(1)
              }}
              aria-pressed={active === 1}
            >
              <span className="hier__tag">App · {app}</span>
              <span className="hier__inline">
                {i === 0 ? 'agent: claude-sonnet-5-5 · 12 steps · trust: gitlab → chat' : '3 collections · YAML only'}
              </span>

              <div className="hier__nest hier__nest--collections">
                {i === 0 ? (
                  <div
                    role="listitem"
                    className="hier__row"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(2)
                    }}
                  >
                    {CTRLF_COLLECTIONS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className={`hier__coll hier__level--cyan${active === 2 ? ' is-active' : ''}`}
                        tabIndex={active === 2 ? 0 : -1}
                        aria-pressed={active === 2}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>{c.name}</span>
                        <small>{c.profile}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="hier__row" role="listitem" onClick={(e) => { e.stopPropagation(); onSelect(2) }}>
                    {['missile_docs', 'adversary_tactics', 'satellite_docs'].map((c) => (
                      <button key={c} type="button" className={`hier__coll hier__level--cyan${active === 2 ? ' is-active' : ''}`} tabIndex={active === 2 ? 0 : -1}>
                        <span>{c}</span>
                        <small>structured_doc</small>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  role="listitem"
                  className={`hier__doc hier__level--amber${active === 3 ? ' is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(3)
                  }}
                  aria-pressed={active === 3}
                >
                  <span className="hier__tag">Document</span>
                  <code className="hier__path">{i === 0 ? '/chat/infra/2026-09-14-thread-abc.md' : '/missile_docs/ref-manual.md'}</code>
                  <span className="hier__attrs">acl · vpath · content_hash · modified_at</span>

                  <div className="hier__units">
                    {['unit · lines 12–58', 'unit · lines 59–110', 'unit · …'].map((u, j) => (
                      <span
                        key={u}
                        role="listitem"
                        className={`hier__unit hier__level--green${active === 4 ? ' is-active' : ''}`}
                        onClick={() => onSelect(4)}
                        tabIndex={active === 4 ? 0 : -1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onSelect(4)
                          }
                        }}
                      >
                        {u}
                        <small>{j === 0 ? 'locator: thread_ts + message_range' : j === 1 ? 'tsv · embedding · enriched_text' : 'citation anchor per profile'}</small>
                      </span>
                    ))}
                  </div>
                </button>
              </div>
            </button>
          ))}
        </div>
      </button>
    </div>
  )
}
