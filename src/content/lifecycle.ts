/**
 * The agentic retrieval lifecycle, verified against the plan:
 * §1 thesis, §3 query path, Stage 6 (loop, budgets, ledger),
 * Stage 12 (first move, router, flags).
 */

export interface LifecycleStep {
  id: string
  label: string
  short: string
  body: string
  budget?: string
  status: 'core' | 'optional' | 'guard'
  srcRef: { id: string; label: string }
}

export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    id: 'question',
    label: 'Question arrives',
    short: 'Question + scope',
    body: 'The platform turns credentials into an AuthContext (app, principal, groups) and injects it. The agent cannot choose or alter scope — tool schemas never contain app or principal fields.',
    status: 'core',
    srcRef: { id: '3-system-architecture', label: '§3 Query path 1' },
  },
  {
    id: 'compose',
    label: 'Prompt composed',
    short: 'Manifest + hints',
    body: 'Static instructions first (for prompt caching), then the app prompt, then only this app’s collection manifest — descriptions, capabilities, document counts, date ranges — routing hints, and trust order. Retrieved content is declared data, not instructions.',
    status: 'core',
    srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 composer' },
  },
  {
    id: 'firstmove',
    label: 'First move (optional)',
    short: 'Decompose & seed',
    body: 'A cheap model call returns a validated JSON plan: intent, entities, up to four sub-queries with collection/tool hints, time sensitivity. Sub-queries run in parallel through the same scoped tools; the pool is deduped, reranked, and injected as a labeled pre-retrieved block registered in the evidence ledger. Trivial queries — a single identifier or very short text — skip the step.',
    budget: 'Sub-queries count against step and token budgets; invalid JSON retries once, then falls back to no decomposition.',
    status: 'optional',
    srcRef: { id: 'stage-12-reranking-first-move-decomposition-routing-and-trust-rules', label: 'Stage 12 first move' },
  },
  {
    id: 'select',
    label: 'Tool selection',
    short: 'Route by shape',
    body: 'The agent plans and picks tools per query shape. Deterministic router rules: identifier-shaped queries schedule grep and find_symbol; ticket keys schedule get_ticket; quoted strings or stack-trace-like text schedule grep; plain how-to questions schedule search over document collections first. Routing hints appear in the prompt and feed these rules.',
    status: 'core',
    srcRef: { id: 'stage-12-reranking-first-move-decomposition-routing-and-trust-rules', label: 'Stage 12 router' },
  },
  {
    id: 'retrieve',
    label: 'Scoped retrieval',
    short: 'QueryService → RLS',
    body: 'Each tool call goes to QueryService, which resolves permitted collections and runs retrieval through Postgres under row-level security. Hybrid runs lexical and dense concurrently (default 50 candidates each), fuses per collection then across collections by RRF, optionally reranks the fused top 50, then applies bounded authority × recency weighting.',
    status: 'core',
    srcRef: { id: '3-system-architecture', label: '§3 Query path 4–5' },
  },
  {
    id: 'inspect',
    label: 'Evidence inspection',
    short: 'Compact hits → ledger',
    body: 'Results render compactly under a token budget; each hit gets a citation id [1] [2] with its locator, collection, and modified date, wrapped in escaped data blocks. Every hit shown to the model enters the evidence ledger. Identical repeated tool calls return a note pointing to the earlier result.',
    status: 'core',
    srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 ledger' },
  },
  {
    id: 'reformulate',
    label: 'Reformulate or expand',
    short: 'Iterate the search',
    body: 'If evidence is insufficient, the agent reformulates — different tool, different terms, narrower path scope — or expands along structure: get_outline → read_section within a document, follow_links across collections (chat thread → ticket → runbook), read_thread ranges, find_references. Over-budget older results compact to short stubs.',
    status: 'core',
    srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Thesis' },
  },
  {
    id: 'sufficiency',
    label: 'Sufficiency & stop',
    short: 'Grounded or budget',
    body: 'The loop stops on a final answer when the model has grounded evidence — or on a hard budget: max_steps (ctrl-f: 12), max_tool_tokens (40,000), wall-clock timeout, or a spend cap. Hitting a budget forces a final answer that states what is missing; the recorded stop reason says which budget triggered.',
    budget: 'max_steps: 12 · max_tool_tokens: 40,000 · wall-clock timeout · per-app daily spend caps (14B)',
    status: 'guard',
    srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 budgets' },
  },
  {
    id: 'answer',
    label: 'Grounded answer + citations',
    short: 'Validate & cite',
    body: 'A validator checks that every citation id maps to evidence actually shown — {vpath, locator, source_uri, modified_at, collection} — strips unknown ids, and flags an answer with no valid citations as ungrounded. Conflict hints surface possible contradictions between older and newer sources so the agent states both and recommends verification.',
    status: 'core',
    srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 validator' },
  },
]

export interface ToolChip {
  name: string
  mode: string
  stage: number
  status: 'available-at' | 'deferred'
}

/** Where the agent's toolbox comes from (profiles §3/§6 + stage delivery). */
export const TOOLBOX: ToolChip[] = [
  { name: 'grep', mode: 'exact · literal + regex, RE2', stage: 4, status: 'available-at' },
  { name: 'glob', mode: 'paths · * ** ? {}', stage: 4, status: 'available-at' },
  { name: 'read', mode: 'line ranges from document bodies', stage: 4, status: 'available-at' },
  { name: 'ls', mode: 'virtual directory listings', stage: 4, status: 'available-at' },
  { name: 'search · lexical', mode: 'ts_rank_cd · phrases · negation', stage: 4, status: 'available-at' },
  { name: 'search · dense', mode: 'HNSW over enriched_text', stage: 5, status: 'available-at' },
  { name: 'search · hybrid', mode: 'RRF fuse ± rerank ± boosts', stage: 5, status: 'available-at' },
  { name: 'get_outline', mode: 'heading tree with token counts', stage: 7, status: 'available-at' },
  { name: 'read_section', mode: 'exact section by heading path', stage: 7, status: 'available-at' },
  { name: 'find_symbol', mode: 'definitions, kind filter, fuzzy miss', stage: 8, status: 'available-at' },
  { name: 'find_references', mode: 'name-based, resolved=false', stage: 8, status: 'available-at' },
  { name: 'search_threads', mode: 'channel · date · author filters', stage: 9, status: 'available-at' },
  { name: 'read_thread', mode: 'paginated transcript', stage: 9, status: 'available-at' },
  { name: 'search_tickets', mode: 'meaning + structure filters', stage: 10, status: 'available-at' },
  { name: 'get_ticket', mode: 'full ticket + linked-issue summaries', stage: 10, status: 'available-at' },
  { name: 'follow_links', mode: 'depth ≤ 2, visibility rules', stage: 11, status: 'available-at' },
  { name: 'search_pages', mode: 'EmbeddingGemma 2 multimodal embeddings, then ColPali-style late interaction if needed', stage: 15, status: 'deferred' },
  { name: 'search_entities', mode: 'extracted graph + neighborhoods', stage: 15, status: 'deferred' },
]

export const AGENT_CONTROLS = [
  {
    title: 'Budgets are hard',
    body: 'max_steps, max_tool_tokens, and wall-clock timeout bound every run; a hit forces a final answer stating what is missing. Never let the model choose the result count without a hard cap.',
  },
  {
    title: 'Evidence over vibes',
    body: 'Sufficiency means grounded evidence in the ledger, not confidence. An answer whose ids all fail validation is flagged ungrounded — visible, not hidden.',
  },
  {
    title: 'Oversized results degrade agents',
    body: 'The plan names oversized tool results as the main way agents degrade: render compactly, paginate easily, compact stale results to stubs, version the format with golden-file tests.',
  },
  {
    title: 'Flags until data',
    body: 'rerank, authority, recency, first_move, conflict_hints, link_expansion — each independently switchable per app, default behavior decided by Stage 13 measurement, not taste.',
  },
]
