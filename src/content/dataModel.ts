/**
 * Data model & collection profiles (§5, §6). Field lists come straight from
 * the plan's table — no invented schema.
 */

export interface Entity {
  id: string
  name: string
  purpose: string
  keyColumns: string[]
  color: 'violet' | 'cyan' | 'amber' | 'green' | 'neutral'
  retrievable: boolean // carries app_id + collection_id, under RLS
}

export const ENTITIES: Entity[] = [
  { id: 'apps', name: 'apps', purpose: 'Tenant boundary', keyColumns: ['id', 'name', 'config jsonb (prompt, trust order, agent settings)'], color: 'violet', retrievable: false },
  { id: 'collections', name: 'collections', purpose: 'Retrieval unit inside an app', keyColumns: ['id', 'app_id', 'name', 'profile', 'config jsonb', 'embedding_model', 'embedding_dim'], color: 'cyan', retrievable: false },
  { id: 'documents', name: 'documents', purpose: 'Normalized source object', keyColumns: ['id', 'app_id', 'collection_id', 'external_id', 'source_uri', 'vpath', 'title', 'doc_type', 'content_hash', 'modified_at', 'ingested_at', 'authority', 'acl text[]', 'parent_id', 'attributes jsonb', 'deleted_at'], color: 'amber', retrievable: true },
  { id: 'units', name: 'units', purpose: 'Retrievable segment', keyColumns: ['id', 'document_id', 'app_id', 'collection_id', 'ordinal', 'locator jsonb', 'text', 'enriched_text', 'token_count', 'content_hash', 'attributes', 'tsv tsvector'], color: 'green', retrievable: true },
  { id: 'unit_embeddings', name: 'unit_embeddings', purpose: 'Dense vectors', keyColumns: ['unit_id', 'collection_id', 'model', 'dim', 'embedding'], color: 'green', retrievable: true },
  { id: 'document_bodies', name: 'document_bodies', purpose: 'Full normalized text per document — grep & line-accurate reads never reconstruct from units', keyColumns: ['document_id', 'app_id', 'collection_id', 'text'], color: 'green', retrievable: true },
  { id: 'symbols', name: 'symbols', purpose: 'Code definitions and references', keyColumns: ['id', 'collection_id', 'document_id', 'unit_id', 'name', 'qualified_name', 'kind', 'role', 'line_start', 'line_end'], color: 'cyan', retrievable: true },
  { id: 'outline_nodes', name: 'outline_nodes', purpose: 'Heading tree per document', keyColumns: ['id', 'document_id', 'parent_id', 'level', 'heading', 'ordinal', 'first_unit_id', 'last_unit_id'], color: 'cyan', retrievable: true },
  { id: 'links', name: 'links', purpose: 'Cross-document edges', keyColumns: ['id', 'app_id', 'src_document_id', 'dst_document_id (nullable)', 'dst_ref', 'kind', 'evidence_unit_id'], color: 'cyan', retrievable: true },
  { id: 'sync_state', name: 'sync_state', purpose: 'Incremental sync cursors', keyColumns: ['collection_id', 'cursor', 'last_started', 'last_finished', 'status', 'stats'], color: 'neutral', retrievable: false },
  { id: 'jobs', name: 'jobs', purpose: 'Pipeline work queue', keyColumns: ['managed by the queue library'], color: 'neutral', retrievable: false },
  { id: 'audit_log', name: 'audit_log', purpose: 'Every tool call', keyColumns: ['ts', 'app_id', 'principal', 'tool', 'args_hash', 'result_unit_ids'], color: 'neutral', retrievable: false },
  { id: 'eval', name: 'eval_*', purpose: 'Golden questions and run results', keyColumns: ['created in Stage 13'], color: 'neutral', retrievable: false },
]

export interface DataRule {
  title: string
  body: string
  kind: 'invariant' | 'security'
}

export const DATA_RULES: DataRule[] = [
  {
    kind: 'invariant',
    title: 'Stable IDs',
    body: 'documents.id is a deterministic UUID from (app_id, collection_id, external_id). units.id derives from (document_id, ordinal, content_hash) — unchanged units keep their IDs across syncs.',
  },
  {
    kind: 'security',
    title: 'ACL semantics',
    body: 'acl is a list of principal identifiers (user:…, group:…). Empty means visible to everyone in the app. Query-time predicate: acl = ’{}’ OR acl && :principals. Mirrored from source at ingestion and re-synced every pass — permission metadata is treated as dynamic.',
  },
  {
    kind: 'security',
    title: 'Row-level security',
    body: 'Policies on documents, units, unit_embeddings, symbols, outline_nodes, links require app_id = current_setting(’towel.app_id’) plus the ACL predicate. Session variables come from AuthContext on every connection checkout; the application role cannot bypass RLS.',
  },
  {
    kind: 'invariant',
    title: 'One embedding model per collection',
    body: 'Fixed in the collection config; the platform default is EmbeddingGemma 2 at native 768 dims, so v1 collections share one self-hosted model and one vector space. The ANN index is a per-collection partial HNSW index with an expression cast to the collection’s dimension, so one collection’s vectors never affect another’s recall.',
  },
  {
    kind: 'invariant',
    title: 'Soft deletes + purge',
    body: 'Source deletions set deleted_at; a reconciler purges units, embeddings, symbols, links, and outline nodes so stale content cannot be retrieved.',
  },
  {
    kind: 'invariant',
    title: 'Authority',
    body: 'An integer derived from the app’s trust_order (lower is more trusted), stored on the document so ranking and agent hints can use it without app logic.',
  },
]

export interface ProfileRow {
  profile: string
  segmenter: string
  indexes: string
  tools: string
  delivered: string
  status: 'stage' | 'deferred'
  usedBy: string
}

export const PROFILE_MATRIX: ProfileRow[] = [
  { profile: 'basic', segmenter: 'fixed window', indexes: 'lexical, dense', tools: 'core set', delivered: 'Stage 6', status: 'stage', usedBy: 'test app, ad-hoc uploads' },
  { profile: 'structured_doc', segmenter: 'heading tree', indexes: 'lexical, dense, outline', tools: 'get_outline · read_section', delivered: 'Stage 7', status: 'stage', usedBy: 'ctrl-f: confluence, knowledge_doc · app-2: all three collections' },
  { profile: 'code', segmenter: 'AST chunks', indexes: 'lexical (code tokenizer), trigram, symbols, dense', tools: 'find_symbol · find_references', delivered: 'Stage 8', status: 'stage', usedBy: 'ctrl-f: gitlab' },
  { profile: 'thread', segmenter: 'thread / conversation', indexes: 'lexical, dense', tools: 'search_threads · read_thread', delivered: 'Stage 9', status: 'stage', usedBy: 'ctrl-f: chat' },
  { profile: 'ticket', segmenter: 'overview + comment groups', indexes: 'lexical, dense, attribute filters', tools: 'search_tickets · get_ticket', delivered: 'Stage 10', status: 'stage', usedBy: 'ctrl-f: jira' },
  { profile: 'visual_doc', segmenter: 'page images', indexes: 'shared 768-d multimodal vectors, or late-interaction vectors', tools: 'search_pages', delivered: 'Stage 15A · if needed', status: 'deferred', usedBy: '—' },
  { profile: 'entity_graph', segmenter: 'entity extraction', indexes: 'graph', tools: 'search_entities', delivered: 'Stage 15B · if needed', status: 'deferred', usedBy: '—' },
]

export const ALL_TOOLS_NOTE =
  'All profiles also get grep, glob, read, ls, and search — plus follow_links once Stage 11 lands.'

export interface CtrlFCollection {
  name: string
  description: string
  profile: string
  connector: string
  extras: string[]
}

export const CTRLF_COLLECTIONS: CtrlFCollection[] = [
  { name: 'gitlab', description: 'Source code for all GitLab projects', profile: 'code', connector: 'gitlab · groups: platform, payments · webhook sync', extras: ['embedding: embeddinggemma-2 · dim 768', 'cursor: last indexed commit SHA'] },
  { name: 'confluence', description: 'How-to docs, runbooks, and design docs', profile: 'structured_doc', connector: 'confluence · spaces ENG, OPS', extras: ['enrich: contextual_prefix'] },
  { name: 'jira', description: 'Tickets with comments, status, and links', profile: 'ticket', connector: 'jira · projects PAY, PLAT', extras: ['JQL updated incremental sync'] },
  { name: 'chat', description: 'Team chat threads (informal, may be outdated)', profile: 'thread', connector: 'slack · channels infra, payments', extras: ['enrich: qa_distill (optional)', 'DMs never ingested'] },
  { name: 'knowledge_doc', description: 'Misc knowledge articles in mixed formats', profile: 'structured_doc', connector: 'upload', extras: ['mixed formats via Docling'] },
]

export const CTRLF_TRUST_ORDER = ['gitlab', 'knowledge_doc', 'confluence', 'jira', 'chat']

export const APP2_COLLECTIONS = [
  { name: 'missile_docs', description: 'Technical reference documents', profile: 'structured_doc' },
  { name: 'adversary_tactics', description: 'Tactics write-ups and taxonomies', profile: 'structured_doc' },
  { name: 'satellite_docs', description: 'Satellite reference documents', profile: 'structured_doc' },
]

export const APP2_NOTE =
  'Profile assignments for app-2 are assumptions about the content and should be confirmed when that app is onboarded (§9 open question #6). The app demonstrates logical separation only — so agents are not confused by diverse context — and needs no separate infrastructure or keys in v1.'

export const LOCATOR_ROWS = [
  { profile: 'code', fields: 'path · start_line · end_line · symbol · commit' },
  { profile: 'structured_doc', fields: 'heading_path (list) · page (optional) · anchor' },
  { profile: 'thread', fields: 'channel · thread_ts · message_range' },
  { profile: 'ticket', fields: 'key · section (description | comment:N) · updated_at' },
]

export const VFS_EXAMPLES = [
  { path: '/confluence/ENG/deploy-runbook.md', note: 'space-scoped Confluence page' },
  { path: '/chat/infra/2026-09-14-thread-abc.md', note: 'one document per Slack thread' },
  { path: '/gitlab/payments-service/src/auth.py', note: 'default-branch file, raw text' },
  { path: '/jira/PAY-1423.md', note: 'issue with header, description, comments, links' },
]

export const ONBOARDING_RECIPES = [
  { change: 'New collection in an existing profile', work: 'Add a block to the app YAML', code: 'No code' },
  { change: 'New app', work: 'Add a file under apps/', code: 'No code (unless it needs a new connector)' },
  { change: 'New connector', work: 'Implement the Connector protocol (list, fetch, changes_since_cursor, ACL mapping), register, add recorded-fixture test', code: 'One protocol implementation' },
  { change: 'New profile', work: 'Combine existing parser, segmenter, and index components in a profile YAML; implement any missing protocol + locator spec', code: 'Composition first' },
]
