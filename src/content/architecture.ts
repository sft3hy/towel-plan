import type { Topic } from './stages'

/** Semantic accent color for a diagram node; topic names also carry colors
 *  via CSS classes, so the union covers both vocabularies. */
export type NodeTopic = Topic | 'cyan' | 'violet' | 'amber' | 'green' | 'neutral'

export interface ArchNode {
  id: string
  label: string
  sub?: string
  topic: NodeTopic
  summary: string
  inputs: string[]
  outputs: string[]
  depends: string[]
  guarantees?: string[]
  stage: string
  srcRef: { id: string; label: string }
  planned?: boolean // rendered dashed when the capability is not yet delivered at that layer
  detailMarkdown?: string
}

export interface ArchEdge {
  from: string
  to: string
  label?: string
  kind: 'query' | 'write' | 'event' | 'control'
  dashed?: boolean
}

export interface CanvasPos {
  x: number
  y: number
  w: number
  h: number
}

export interface ArchView {
  id: string
  label: string
  title: string
  blurb: string
  nodes: ArchNode[]
  edges: ArchEdge[]
  positions: Record<string, CanvasPos>
  width: number
  height: number
}

const N = (
  id: string,
  label: string,
  sub: string,
  topic: NodeTopic,
  extra: Partial<ArchNode>,
): ArchNode => ({
  id,
  label,
  sub,
  topic,
  summary: '',
  inputs: [],
  outputs: [],
  depends: [],
  stage: '',
  srcRef: { id: '', label: '' },
  ...extra,
})

// ---------------------------------------------------------------------------
// View 1 — System context (§3)
// ---------------------------------------------------------------------------

export const CONTEXT_VIEW: ArchView = {
  id: 'context',
  label: 'System context',
  title: 'Five parts, one scoped path',
  blurb:
    'Towel has five parts: clients, a per-app agent runtime, one scoped query layer, a Postgres store, and a profile-driven ingestion pipeline. The query layer is the only path from agents to data, and it is where app, principal, and ACL scope are enforced.',
  width: 1120,
  height: 660,
  nodes: [
    N('clients', 'Clients', 'Web UI · CLI · API consumers', 'neutral', {
      summary:
        'People ask questions through the drag-and-drop web UI (Stage 14C), the towel CLI (towel ask / search / grep), or the HTTP API. Clients hold credentials — they never choose the app scope directly.',
      inputs: ['Questions, searches, uploads'],
      outputs: ['Credentials (OIDC JWT or app-scoped API key)'],
      depends: ['API server (Stage 14A)'],
      stage: 'Stage 14',
      srcRef: { id: '3-system-architecture', label: '§3 Clients' },
    }),
    N('agentA', 'ctrl-f agent runtime', 'model · prompt · budgets · tools', 'violet', {
      summary:
        'An agent with a toolbox of retrieval primitives, generated from the app’s YAML config. It plans, calls tools in parallel, inspects evidence, reformulates, and stops when grounded — under max_steps 12 and max_tool_tokens 40,000.',
      inputs: ['Question + AuthContext', 'Collection manifest · routing hints · trust order'],
      outputs: ['Tool calls', 'Cited final answer'],
      depends: ['QueryService', 'Anthropic LLMClient'],
      guarantees: ['Prompt contains only this app’s collections', 'AuthContext is injected, never chosen by the agent'],
      stage: 'Stage 6',
      srcRef: { id: '3-system-architecture', label: '§3 Query path' },
    }),
    N('agentB', 'app-2 agent runtime', 'separate prompt · trust order', 'violet', {
      summary:
        'A second tenant (missile_docs, adversary_tactics, satellite_docs) proves the thesis: onboarded with YAML only, with its own agent config. Its agent never sees ctrl-f’s vocabulary or content — logical separation is enough in v1.',
      inputs: ['Question + AuthContext'],
      outputs: ['Cited answers over its own collections'],
      depends: ['Same QueryService', 'Same store'],
      guarantees: ['Vocabulary isolation: manifest and tool enums list only app-2 collections'],
      stage: 'Stage 14D',
      srcRef: { id: 'app-definition-second-app-illustrative', label: '§6 Second app definition' },
    }),
    N('qs', 'QueryService', 'the only path from agents to data', 'cyan', {
      summary:
        'Single entry point for grep, glob, read, ls, lexical, dense, and hybrid search. Requires an AuthContext, resolves the collections permitted for that app, runs every retrieval under row-level security, fuses with RRF, reranks, boosts, and renders results compactly under a token budget.',
      inputs: ['AuthContext + tool call arguments'],
      outputs: ['ToolResult: compact hits with citation ids, locators, dates'],
      depends: ['Postgres (RLS)', 'Fusion / reranker', 'Renderer'],
      guarantees: ['Rejects unknown collections listing only the caller’s own', 'Every retrieval tool registers with the isolation harness'],
      stage: 'Stage 5',
      srcRef: { id: '3-system-architecture', label: '§3 Query path' },
    }),
    N('store', 'Postgres 16 store', 'pgvector · FTS · pg_trgm · RLS', 'neutral', {
      summary:
        'One store keeps v1 small. Every retrievable row carries app_id and collection_id; row-level security enforces app + ACL predicates inside the database. Per-collection partial indexes (GIN tsv, trigram GIN, HNSW at the collection’s dimension) keep filtered queries cheap and recall intact.',
      inputs: ['Units, embeddings, symbols, outline nodes, links, bodies'],
      outputs: ['Ranked, scoped rows'],
      depends: ['Migrations (Stage 2)', 'Index manager'],
      guarantees: ['NOBYPASSRLS application role', 'Session vars set from AuthContext on every checkout', 'Fail closed when settings are absent'],
      stage: 'Stage 2',
      srcRef: { id: '5-data-model', label: '§5 Data model' },
    }),
    N('ingest', 'Ingestion pipeline', 'queue · parse · segment · enrich · index', 'amber', {
      summary:
        'Profile-driven. A sync job pulls changes through Connector → Parser → Segmenter → Enrichers → Indexers, mirrors source ACLs into metadata, redacts secrets before storage, reconciles deletions, and advances cursors only after commit.',
      inputs: ['Raw source documents + permissions'],
      outputs: ['Documents, units, enriched_text, vectors, symbols, outlines, links'],
      depends: ['Connectors', 'Repository layer', 'Job queue'],
      stage: 'Stage 3',
      srcRef: { id: '3-system-architecture', label: '§3 Ingestion path' },
    }),
    N('sources', 'Source systems', 'GitLab · Confluence · Jira · Slack · uploads', 'neutral', {
      summary:
        'Read-only. Towel writes back to no source system in v1. Connectors list/diff via cursors and map source permissions to ACL principals, failing closed when permissions cannot be resolved.',
      inputs: [],
      outputs: ['Raw documents, changes-since-cursor, ACL metadata'],
      depends: ['Connector registry'],
      stage: 'Stages 7–10',
      srcRef: { id: '3-system-architecture', label: '§3' },
    }),
    N('evals', 'Eval harness', 'golden sets · judge · gates', 'green', {
      summary:
        'Settles the open decisions on data: recall@k, MRR, nDCG, citation metrics, latency percentiles, ablations of every Stage 12 flag, ANN-recall health, and a regression gate that later stages must not breach.',
      inputs: ['Golden questions + human labels'],
      outputs: ['Scorecards · regressions · data-backed choices'],
      depends: ['QueryService', 'Agent runtime'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13' },
    }),
  ],
  edges: [
    { from: 'clients', to: 'agentA', label: 'ask / search', kind: 'query' },
    { from: 'clients', to: 'agentB', label: 'ask / search', kind: 'query' },
    { from: 'agentA', to: 'qs', label: 'tool calls', kind: 'query' },
    { from: 'agentB', to: 'qs', label: 'tool calls', kind: 'query' },
    { from: 'qs', to: 'store', label: 'SQL under RLS', kind: 'query' },
    { from: 'sources', to: 'ingest', label: 'webhooks · schedules', kind: 'event' },
    { from: 'ingest', to: 'store', label: 'writes units + indexes', kind: 'write' },
    { from: 'evals', to: 'qs', label: 'drives evals', kind: 'control', dashed: true },
  ],
  positions: {
    clients: { x: 380, y: 24, w: 360, h: 92 },
    agentA: { x: 130, y: 170, w: 300, h: 116 },
    agentB: { x: 690, y: 170, w: 300, h: 116 },
    qs: { x: 300, y: 350, w: 520, h: 96 },
    store: { x: 300, y: 516, w: 520, h: 96 },
    ingest: { x: 20, y: 516, w: 250, h: 96 },
    sources: { x: 20, y: 350, w: 250, h: 96 },
    evals: { x: 872, y: 350, w: 230, h: 96 },
  },
}

// ---------------------------------------------------------------------------
// View 2 — Ingestion & indexing (§3 ingestion path, Stage 3 runtime)
// ---------------------------------------------------------------------------

export const INGESTION_VIEW: ArchView = {
  id: 'ingestion',
  label: 'Ingestion & indexing',
  title: 'From webhook to searchable index',
  blurb:
    'Every collection runs the same stages — Connector, Parser, Segmenter, Enricher, Indexers, Link extractors — as components chosen by the collection’s profile. Idempotent by content hash; deletions reconciled; the cursor advances only after the run commits.',
  width: 1160,
  height: 420,
  nodes: [
    N('trigger', 'Trigger', 'webhook · schedule · towel sync', 'amber', {
      summary: 'A webhook (verified signature, debounced bursts), a schedule, or `towel sync <app> <collection>` enqueues a sync job for one collection.',
      inputs: ['Source events, operator commands'],
      outputs: ['enqueue_sync jobs with scope hints'],
      depends: ['Job queue'],
      stage: 'Stage 3 (webhooks in 14B)',
      srcRef: { id: '3-system-architecture', label: '§3 Ingestion path' },
    }),
    N('queue', 'Postgres queue', 'SKIP LOCKED · retries · DLQ', 'neutral', {
      summary:
        'Job types sync_collection, ingest_document, reindex_collection, purge_deleted. Idempotency keys dedupe; exponential backoff then dead-letter; per-collection mutual exclusion prevents concurrent sync and reindex.',
      inputs: ['Jobs'],
      outputs: ['Leased jobs per worker'],
      depends: ['Postgres'],
      stage: 'Stage 3',
      srcRef: { id: 'stage-3-pipeline-runtime-job-queue-incremental-sync', label: 'Stage 3 Queue' },
    }),
    N('connector', 'Connector', 'cursor diff · ACL map (fail closed)', 'amber', {
      summary:
        'lists or diffs changes from a cursor and maps source permissions to ACL principals. If permissions cannot be resolved, the document gets a restrictive placeholder ACL and a warning — never public.',
      inputs: ['Cursor + config (groups, spaces, channels, projects)'],
      outputs: ['RawDocument, changes_since, ACL list'],
      depends: ['RateLimiter + retry helpers'],
      stage: 'Stages 3–10',
      srcRef: { id: '3-system-architecture', label: '§3 Ingestion path' },
    }),
    N('parse', 'Parser + redaction', 'docling · confluence_html · source_code', 'cyan', {
      summary:
        'Docling is the default for PDF/DOCX/PPTX/HTML/Markdown; Confluence storage format converts macros to Markdown. A RedactingParser decorator replaces secrets before anything is stored, so secrets never reach grep, indexes, or enrichment.',
      inputs: ['Raw bytes / HTML / ADF'],
      outputs: ['Normalized Markdown text + structure', 'redactions count'],
      depends: ['Parser registry'],
      stage: 'Stages 7–8',
      srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Document parsing' },
    }),
    N('segment', 'Segmenter', 'per source type', 'cyan', {
      summary:
        'fixed_window (basic), heading_tree (docs), ast_code (code, cAST-style split-then-merge), thread (chat), ticket (overview + comment groups). Each unit gets a locator that becomes its citation.',
      inputs: ['Parsed document'],
      outputs: ['UnitDrafts with locators'],
      depends: ['Profile config'],
      stage: 'Stages 6–10',
      srcRef: { id: 'pipeline-and-profiles', label: '§3 Profiles' },
    }),
    N('enrich', 'Enrichers', 'contextual_prefix · qa_distill · path_prefix', 'violet', {
      summary:
        'Writes context into enriched_text while text stays untouched for display and grep. Deterministic breadcrumb or small-LLM preface (prompt-cached); chat can distill Q&A units embedding only the question.',
      inputs: ['Units + document context'],
      outputs: ['enriched_text, derived units (labeled)'],
      depends: ['LLMClient (haiku) + caches'],
      stage: 'Stages 7–9',
      srcRef: { id: 'stage-7-structured-doc-profile-upload-and-confluence-connectors', label: 'Stage 7 enricher' },
    }),
    N('index', 'Indexers', 'lexical tsv · trigram · dense · symbols · outline', 'cyan', {
      summary:
        'lexical fills units.tsv; trigram backs grep prefilter on document_bodies; dense embeds enriched_text into per-collection HNSW; symbols, outline, and links build side indexes. Unchanged content hashes skip work entirely.',
      inputs: ['Units, enriched_text, parsed AST'],
      outputs: ['Indexed, queryable rows'],
      depends: ['Embedder + collection embedding_model/dim'],
      stage: 'Stages 4–11',
      srcRef: { id: '5-data-model', label: '§5 Tables' },
    }),
    N('reconcile', 'Reconcile', 'purge · cursor advance · 30% guard', 'green', {
      summary:
        'Soft deletes set deleted_at; the reconciler purges units, embeddings, symbols, links, and outline nodes so stale content cannot be retrieved. The cursor advances only after the run commits; a run that would delete >30% aborts unless --force.',
      inputs: ['Mark-and-sweep results'],
      outputs: ['Consistent state + run record'],
      depends: ['sync_state · ingest_runs'],
      stage: 'Stage 3',
      srcRef: { id: 'stage-3-pipeline-runtime-job-queue-incremental-sync', label: 'Stage 3 sync algorithm' },
    }),
  ],
  edges: [
    { from: 'trigger', to: 'queue', kind: 'event' },
    { from: 'queue', to: 'connector', kind: 'control' },
    { from: 'connector', to: 'parse', kind: 'write' },
    { from: 'parse', to: 'segment', kind: 'write' },
    { from: 'segment', to: 'enrich', kind: 'write' },
    { from: 'enrich', to: 'index', kind: 'write' },
    { from: 'index', to: 'reconcile', kind: 'write' },
  ],
  positions: {
    trigger: { x: 16, y: 150, w: 150, h: 110 },
    queue: { x: 196, y: 150, w: 150, h: 110 },
    connector: { x: 376, y: 150, w: 150, h: 110 },
    parse: { x: 556, y: 150, w: 150, h: 110 },
    segment: { x: 736, y: 150, w: 150, h: 110 },
    enrich: { x: 916, y: 150, w: 150, h: 110 },
    index: { x: 736, y: 20, w: 150, h: 110 },
    reconcile: { x: 916, y: 290, w: 150, h: 110 },
  },
}

// ---------------------------------------------------------------------------
// View 3 — Retrieval & agent execution (§3 query path + Stage 6 + 12)
// ---------------------------------------------------------------------------

export const RETRIEVAL_VIEW: ArchView = {
  id: 'retrieval',
  label: 'Retrieval & agent loop',
  title: 'One question, many scoped tool calls',
  blurb:
    'The platform injects scope; the agent chooses tools; QueryService fuses, reranks, and renders; a validator checks every citation. First-move decomposition, conflict hints, and reranking are independent flags, measured in Stage 13.',
  width: 1160,
  height: 560,
  nodes: [
    N('q', 'Question + AuthContext', 'app · principal · groups', 'neutral', {
      summary: 'Credentials become an AuthContext at the platform edge. The agent cannot choose or alter it — tool schemas never contain app, principal, or groups fields.',
      inputs: ['OIDC JWT or API key + question'],
      outputs: ['AuthContext'],
      depends: ['IdentityResolver (Stage 14A)'],
      stage: 'Stage 14A (CLI --as before)',
      srcRef: { id: '3-system-architecture', label: '§3 Query path 1' },
    }),
    N('prompt', 'Prompt composer', 'manifest · hints · trust order', 'violet', {
      summary:
        'Static instructions first (for prompt caching), then the app prompt, then only this app’s collection manifest — names, descriptions, capabilities, doc counts, date ranges — routing hints, and trust order. Retrieved content is declared data, not instructions.',
      inputs: ['App config', 'AuthContext'],
      outputs: ['System prompt + generated tool list'],
      depends: ['App YAML', 'Tool-factory registry'],
      stage: 'Stage 6',
      srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 composer' },
    }),
    N('firstmove', 'First move (optional)', 'decompose → parallel sub-queries', 'violet', {
      summary:
        'A cheap model call returns a validated JSON plan — intent, entities, up to four sub-queries with collection/tool hints, time sensitivity. Sub-queries run through the same scoped tools, dedupe, rerank, and seed the evidence ledger. Trivial queries skip it. Flag: first_move.',
      inputs: ['Question'],
      outputs: ['Pre-retrieved evidence block (ledger-registered)'],
      depends: ['QueryService', 'Budgets'],
      stage: 'Stage 12',
      planned: false,
      srcRef: { id: 'stage-12-reranking-first-move-decomposition-routing-and-trust-rules', label: 'Stage 12' },
    }),
    N('loop', 'Agent loop', 'plan → call → inspect → reformulate', 'violet', {
      summary:
        'Parallel tool calls allowed. Identical repeated calls return a note pointing to the earlier result; over-budget older results compact to stubs. Budgets: max_steps, max_tool_tokens, wall clock — hitting one forces a final answer stating what is missing.',
      inputs: ['Model responses', 'ToolResult blocks'],
      outputs: ['Tool calls or final answer'],
      depends: ['Generated tools', 'Evidence ledger'],
      stage: 'Stage 6',
      srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 loop' },
    }),
    N('tools', 'Generated tool surface', 'grep · glob · search · outline · symbols · links', 'cyan', {
      summary:
        'Built from app config + collection profiles. collections arguments are enums of that app’s names only. Capability-gated factories appear when a profile declares the required index: find_symbol needs symbols, get_outline needs outline, and so on.',
      inputs: ['Tool-factory registry + profiles'],
      outputs: ['JSON schemas (never containing scope fields)'],
      depends: ['Profiles', 'QueryService'],
      stage: 'Stages 6–11',
      srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 tools' },
    }),
    N('qs2', 'QueryService', 'resolve scope → retrieve under RLS', 'cyan', {
      summary:
        'Resolves permitted collections, applies metadata/date filters inside both retrievers before ranking, runs lexical + dense concurrently (default 50 candidates each), fuses per collection then across collections so a large collection cannot dominate.',
      inputs: ['AuthContext + args'],
      outputs: ['Provenance-tagged ranked hits'],
      depends: ['Postgres RLS', 'LexicalIndex', 'Dense HNSW'],
      guarantees: ['Unknown collection → error listing only the caller’s own'],
      stage: 'Stage 5',
      srcRef: { id: 'stage-5-embeddings-hybrid-retrieval-and-the-scoped-query-service', label: 'Stage 5' },
    }),
    N('fuse', 'Fuse → rerank → boost', 'RRF · BGE reranker · bounded weights', 'amber', {
      summary:
        'RRF on ranks (k=60), deterministic tie-break, dedupe, per-document collapse. Optional cross-encoder rerank of top 50 (timeout → fused order, rerank_status=fallback). Then authority × recency, each bounded ±15% so relevance dominates.',
      inputs: ['Ranked lists with provenance'],
      outputs: ['Final ordered candidates'],
      depends: ['Reranker protocol', 'trust_order', 'profile half-lives'],
      stage: 'Stages 5 + 12',
      srcRef: { id: '3-system-architecture', label: '§3 Query path 5' },
    }),
    N('render', 'Compact renderer', 'token budget · citation ids', 'cyan', {
      summary:
        'render_hits(hits, token_budget) emits the versioned compact text the agent sees: snippet with highlights, vpath, locator, collection, date, truncated flag, next_offset, estimated tokens. Format changes are golden-file tested.',
      inputs: ['Final candidates'],
      outputs: ['ToolResult text under budget'],
      depends: ['Renderer v1'],
      stage: 'Stage 4',
      srcRef: { id: 'stage-4-virtual-filesystem-and-universal-lexical-layer', label: 'Stage 4 renderer' },
    }),
    N('ledger', 'Evidence ledger', '[1] [2] … every hit shown', 'green', {
      summary:
        'Every hit shown to the model gets a short citation id. The validator maps ids to {vpath, locator, source_uri, modified_at, collection}, strips unknown ids, and flags an answer with no valid citations as ungrounded.',
      inputs: ['Shown hits + final answer'],
      outputs: ['Validated citations'],
      depends: ['agent_runs trace'],
      stage: 'Stage 6',
      srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 ledger' },
    }),
    N('answer', 'Grounded answer', 'citations + dates · or forced final', 'green', {
      summary: 'Final answer citing [ids], every citation resolving to evidence actually shown. On budget exhaustion a forced final answer states what is missing; stop reason is recorded.',
      inputs: ['Ledger-validated ids'],
      outputs: ['Answer + citations + run trace'],
      depends: ['Validator'],
      stage: 'Stage 6',
      srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Goals' },
    }),
  ],
  edges: [
    { from: 'q', to: 'prompt', kind: 'control' },
    { from: 'prompt', to: 'firstmove', label: 'optional', kind: 'control', dashed: true },
    { from: 'prompt', to: 'loop', kind: 'control' },
    { from: 'firstmove', to: 'loop', label: 'seeded evidence', kind: 'write', dashed: true },
    { from: 'loop', to: 'tools', label: 'choose', kind: 'control' },
    { from: 'tools', to: 'qs2', label: 'run(auth)', kind: 'query' },
    { from: 'qs2', to: 'fuse', kind: 'query' },
    { from: 'fuse', to: 'render', kind: 'write' },
    { from: 'render', to: 'ledger', kind: 'write' },
    { from: 'ledger', to: 'loop', label: 'inspect', kind: 'event' },
    { from: 'loop', to: 'answer', label: 'grounded', kind: 'control' },
  ],
  positions: {
    q: { x: 20, y: 220, w: 170, h: 104 },
    prompt: { x: 230, y: 220, w: 180, h: 104 },
    firstmove: { x: 230, y: 60, w: 180, h: 96 },
    loop: { x: 450, y: 220, w: 190, h: 104 },
    tools: { x: 450, y: 60, w: 190, h: 96 },
    qs2: { x: 680, y: 220, w: 190, h: 104 },
    fuse: { x: 680, y: 60, w: 190, h: 96 },
    render: { x: 910, y: 220, w: 190, h: 104 },
    ledger: { x: 910, y: 60, w: 190, h: 96 },
    answer: { x: 700, y: 400, w: 320, h: 96 },
  },
}

// ---------------------------------------------------------------------------
// View 4 — Security & isolation (before retrieval, in the database)
// ---------------------------------------------------------------------------

export const SECURITY_VIEW: ArchView = {
  id: 'security',
  label: 'Security & isolation',
  title: 'Scope is injected, enforced, and tested',
  blurb:
    'Filters run in the database before retrieval — never in the prompt. Scope is injected by the platform, missing session settings return zero rows, and every retrieval tool must pass the adversarial isolation harness.',
  width: 1160,
  height: 520,
  nodes: [
    N('cred', 'Credentials', 'OIDC JWT · API key', 'neutral', {
      summary: 'The app and caller identity come only from credentials. A URL app that differs from the token’s app gets 403; invalid or expired tokens get 401. The client never states its own scope.',
      inputs: ['Tokens, keys'],
      outputs: ['Authenticated app + principal'],
      depends: ['Stage 14A'],
      stage: 'Stage 14A',
      srcRef: { id: 'stage-14a-http-api-authentication-and-identity-mapping', label: 'Stage 14A' },
    }),
    N('authz', 'AuthContext', 'app_id · principal · groups', 'neutral', {
      summary:
        'Immutable, built by the platform, required argument of every repository and service method. principals() = principal + groups. Ingestion uses AuthContext.service(app_id), which bypasses only the ACL half — never the app boundary.',
      inputs: ['Identity mapping (unmapped users fail closed)'],
      outputs: ['Session variables towel.app_id / towel.principals'],
      depends: ['connect(auth) session factory'],
      guarantees: ['SET LOCAL per transaction', 'Pooled connections never leak settings'],
      stage: 'Stages 1–2',
      srcRef: { id: 'stage-2-storage-layer-migrations-acl-and-rls', label: 'Stage 2' },
    }),
    N('schema', 'Tool schemas', 'no app · no principal fields', 'violet', {
      summary:
        'Schemas never contain app_id, principal, or groups; property tests confirm this across all tools. Attempts to set those fields, call unknown tools, or name another app’s collection are rejected as error results — the agent cannot talk its way out of scope.',
      inputs: ['Generated tool list'],
      outputs: ['Validated arguments only'],
      depends: ['Tool generator (Stage 6)'],
      stage: 'Stage 6',
      srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 injection hygiene' },
    }),
    N('qs3', 'QueryService scope', 'resolve permitted collections', 'cyan', {
      summary:
        'Resolves the set of collections permitted for the app before any retrieval. Filtering is applied inside both retrievers, before ranking. Errors list only the caller’s own collections.',
      inputs: ['AuthContext'],
      outputs: ['Scoped queries'],
      depends: ['collections config'],
      stage: 'Stage 5',
      srcRef: { id: 'stage-5-embeddings-hybrid-retrieval-and-the-scoped-query-service', label: 'Stage 5' },
    }),
    N('rls', 'Postgres RLS', 'app_id = setting AND ACL predicate', 'green', {
      summary:
        'FORCE ROW LEVEL SECURITY on documents, units, unit_embeddings, symbols, outline_nodes, links (+ document_bodies). Predicate: app_id = current_setting(“towel.app_id”) AND (acl = ’{}’ OR acl && principals). Missing settings → zero rows. Application role is NOBYPASSRLS and cannot alter policies or write audit_log.',
      inputs: ['Session variables'],
      outputs: ['Rows the caller may see — and nothing else'],
      depends: ['Stage 2 policies'],
      guarantees: ['Not-found (never forbidden) for invisible paths', 'Neighbors, counts, snippets, traces all filtered'],
      stage: 'Stage 2',
      srcRef: { id: 'stage-2-storage-layer-migrations-acl-and-rls', label: 'Stage 2 RLS' },
    }),
    N('harness', 'Isolation harness', 'adversarial suite, per tool', 'amber', {
      summary:
        'towel.testing.isolation runs any retrieval function under multiple app/principal contexts on a seeded two-app, ACL-mixed dataset and asserts zero leakage. Every new retrieval tool must register before it can pass a gate.',
      inputs: ['Seeded fixtures'],
      outputs: ['Zero-leakage proof per tool'],
      depends: ['Stage 5 harness'],
      guarantees: ['Adversarial marker suites in every stage', 'DM ingestion attempts rejected'],
      stage: 'Stage 5 → every stage',
      srcRef: { id: 'stage-5-embeddings-hybrid-retrieval-and-the-scoped-query-service', label: 'Stage 5 harness' },
    }),
    N('failclosed', 'Fail closed', 'unresolvable permission = restricted', 'amber', {
      summary:
        'Every connector maps ACLs from source systems: Confluence restrictions, GitLab membership (incl. inherited groups), Slack private channels, Jira security levels. Unresolvable permissions become restrictive placeholder ACLs plus warnings — never public.',
      inputs: ['Source permission metadata (dynamic)'],
      outputs: ['acl lists refreshed every sync'],
      depends: ['Connector ACL mapping'],
      stage: 'Stages 7–10',
      srcRef: { id: 'stage-7-structured-doc-profile-upload-and-confluence-connectors', label: 'Stage 7 ACL rule' },
    }),
    N('deferred', 'Deferred: silo mode', 'seam kept, rejected in v1', 'neutral', {
      summary:
        'isolation: silo is rejected by the v1 validator with a pointer to Stage 15C — per-app schema or database, encryption keys with rotation, dedicated workers. Logical separation is enough for the second app.',
      inputs: ['Future contractual isolation needs'],
      outputs: [],
      depends: ['Stage 15C'],
      stage: 'Stage 15C (deferred)',
      planned: true,
      srcRef: { id: 'stage-15-optional-extensions', label: 'Stage 15C' },
    }),
  ],
  edges: [
    { from: 'cred', to: 'authz', label: 'identity map', kind: 'control' },
    { from: 'authz', to: 'schema', kind: 'control' },
    { from: 'authz', to: 'qs3', kind: 'control' },
    { from: 'schema', to: 'qs3', kind: 'control' },
    { from: 'qs3', to: 'rls', label: 'SQL', kind: 'query' },
    { from: 'harness', to: 'qs3', label: 'tests every tool', kind: 'control', dashed: true },
    { from: 'harness', to: 'rls', kind: 'control', dashed: true },
    { from: 'failclosed', to: 'rls', label: 'acl rows', kind: 'write' },
    { from: 'deferred', to: 'rls', label: 'hardens later', kind: 'control', dashed: true },
  ],
  positions: {
    cred: { x: 20, y: 40, w: 180, h: 100 },
    authz: { x: 240, y: 40, w: 200, h: 100 },
    schema: { x: 240, y: 210, w: 200, h: 100 },
    qs3: { x: 480, y: 120, w: 200, h: 100 },
    rls: { x: 720, y: 120, w: 240, h: 120 },
    harness: { x: 480, y: 330, w: 200, h: 104 },
    failclosed: { x: 720, y: 330, w: 240, h: 104 },
    deferred: { x: 990, y: 120, w: 150, h: 120 },
  },
}

// ---------------------------------------------------------------------------
// View 5 — Evaluation & quality control (§Stage 13 + §8 budgets)
// ---------------------------------------------------------------------------

export const EVAL_VIEW: ArchView = {
  id: 'evaluation',
  label: 'Evaluation & quality',
  title: 'Every decision settles on data',
  blurb:
    'The harness runs golden questions against the real stack, measures retrieval and answer quality, ablates every optional feature, calibrates its judge, and gates regressions — so flags stay off until they earn their place.',
  width: 1160,
  height: 480,
  nodes: [
    N('golden', 'Golden sets', 'evals/<app>/golden.yaml', 'green', {
      summary:
        'Questions typed lookup / how-to / why / troubleshoot / multi-hop / negative, with graded relevance 0–2 expected sources, answer_points, must_not, as_principal for ACL cases, exclude_docs for leave-one-out. Seeded from planted_facts; mined chat needs human review; 30% held-out.',
      inputs: ['Planted facts · mined Q&A + review'],
      outputs: ['Versioned question sets'],
      depends: ['Stage 0 fixtures'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 golden format' },
    }),
    N('runner', 'Runner', 'deterministic CI + scheduled live', 'cyan', {
      summary:
        'towel evals run --app --set --config flags.yaml persists eval_runs/eval_results and emits JSON + Markdown scorecards with per-type, per-collection breakdowns and p50/p95 latency. Deterministic mode uses fakes; live mode runs on a schedule.',
      inputs: ['Golden set + flag config matrices'],
      outputs: ['Run results (JSON/MD)'],
      depends: ['QueryService', 'Agent runtime'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 runner' },
    }),
    N('metrics', 'Retrieval metrics', 'recall@k · MRR · nDCG@10', 'cyan', {
      summary:
        'No LLM required: recall@1/3/5/10, MRR, nDCG@10 with graded relevance, by question type, collection, and tag, plus latency percentiles. Ablations run lexical-only, dense-only, hybrid, ±rerank, ±authority, ±recency, ±link expansion.',
      inputs: ['Ranked results'],
      outputs: ['Metric tables'],
      depends: ['Deterministic metric tests'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 metrics' },
    }),
    N('judge', 'Answer judge', 'different model · calibrated', 'violet', {
      summary:
        'Judges citation recall/precision, groundedness, correctness vs answer_points, abstention, stale-source usage. Real judge prefers a different model than the agent, versioned prompts; calibrate against human_labels and flag low agreement.',
      inputs: ['Answers + human labels'],
      outputs: ['Verdicts + agreement report'],
      depends: ['Judge protocol', 'FakeJudge for CI'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 judge' },
    }),
    N('gate', 'Regression gate', 'compare A/B · bootstrap CIs', 'amber', {
      summary:
        'towel evals compare reports per-metric deltas with bootstrap confidence intervals; evals gate exits non-zero past the regression threshold. The Stage 13 baseline scorecard is referenced by all later regression gates.',
      inputs: ['Two runs'],
      outputs: ['Ship / block decisions'],
      depends: ['evals/baselines/stage13.json'],
      stage: 'Stage 13 → 14+',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 gating' },
    }),
    N('health', 'ANN health', 'approx vs brute-force recall', 'amber', {
      summary:
        'towel evals ann-recall compares approximate search with brute force per collection and flags recall below threshold — guarding against the classic filtered-ANN recall loss.',
      inputs: ['Generated collections'],
      outputs: ['Recall health flags'],
      depends: ['HNSW indexes'],
      stage: 'Stage 13',
      srcRef: { id: 'stage-13-eval-harness-and-golden-sets', label: 'Stage 13 ANN' },
    }),
    N('obs', 'Observability', 'traces · metrics · spend caps', 'neutral', {
      summary:
        'OpenTelemetry spans across API, agent steps, tools, DB — attributes carry app/collection, never content. Prometheus: ask/tool latency, tokens, cost, queue depth, sync lag, rerank fallbacks, budget stops. Cost per app; spend caps.',
      inputs: ['Production traffic'],
      outputs: ['Dashboards + alerts'],
      depends: ['Stage 14B'],
      stage: 'Stage 14B',
      srcRef: { id: 'stage-14b-webhooks-admin-operations-observability-and-hardening', label: 'Stage 14B' },
    }),
  ],
  edges: [
    { from: 'golden', to: 'runner', kind: 'control' },
    { from: 'runner', to: 'metrics', kind: 'write' },
    { from: 'runner', to: 'judge', kind: 'write' },
    { from: 'judge', to: 'gate', kind: 'control' },
    { from: 'metrics', to: 'gate', kind: 'control' },
    { from: 'health', to: 'gate', kind: 'control', dashed: true },
    { from: 'obs', to: 'runner', kind: 'event', dashed: true },
  ],
  positions: {
    golden: { x: 20, y: 180, w: 190, h: 110 },
    runner: { x: 260, y: 180, w: 190, h: 110 },
    metrics: { x: 500, y: 60, w: 190, h: 110 },
    judge: { x: 500, y: 310, w: 190, h: 110 },
    gate: { x: 760, y: 180, w: 190, h: 110 },
    health: { x: 500, y: 180, w: 190, h: 110 },
    obs: { x: 760, y: 310, w: 190, h: 110 },
  },
}

export const ARCH_VIEWS: ArchView[] = [CONTEXT_VIEW, INGESTION_VIEW, RETRIEVAL_VIEW, SECURITY_VIEW, EVAL_VIEW]
