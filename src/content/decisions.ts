/**
 * Technical decision record (§3 Key decisions, §2 research, §9 deferrals).
 * Engineering interpretation is labeled as such.
 */

export interface Decision {
  id: string
  decision: string
  choice: string
  why: string
  alternatives?: string
  costs?: string
  deferred?: string
  srcRef: { id: string; label: string }
}

/** §3 Key decisions table, enriched with alternatives/costs *where the plan
 *  itself states them* — otherwise omitted rather than invented. */
export const KEY_DECISIONS: Decision[] = [
  {
    id: 'primitives',
    decision: 'Retrieval primitives',
    choice: 'Agent chooses among grep, glob, lexical, dense, outline, symbols, and links',
    why: 'The research found no single method wins across data types — grep leads on exact identifiers and code, embeddings are competitive on prose, structure and links help multi-hop.',
    alternatives: 'Fixed retrieve-then-generate pipeline (rejected by thesis); vector-only; grep-only.',
    srcRef: { id: '3-system-architecture', label: '§3 Key decisions' },
  },
  {
    id: 'fusion',
    decision: 'Fusion',
    choice: 'Reciprocal rank fusion on ranks, not scores',
    why: 'Lexical and dense scores are not comparable; ranks are. RRF k=60, deterministic tie-breaking, dedup by unit, optional collapse per document.',
    costs: 'Throws away score magnitude information — reranking (Stage 12) recovers ordering quality.',
    srcRef: { id: '3-system-architecture', label: '§3 Key decisions' },
  },
  {
    id: 'store',
    decision: 'Store',
    choice: 'Postgres 16 with pgvector, full-text search, and trigram indexes',
    why: 'One store keeps v1 small; every index sits behind an interface so it can be swapped later.',
    costs: 'True BM25 is not native to Postgres — if Stage 13 shows a ranking gap, swap in a BM25 extension or OpenSearch without touching callers.',
    srcRef: { id: '4-tech-stack-repo-layout-and-conventions', label: '§4 Tech stack' },
  },
  {
    id: 'embedder',
    decision: 'Self-hosted embedder',
    choice: 'EmbeddingGemma 2 (google/embeddinggemma-2, Apache 2.0), dense 768-dim, self-hosted',
    why: 'One model covers text and code now and natively encodes images, video, and audio into the same 768-dim space, which makes Stage 15A media retrieval a mode of the existing embedder rather than new index technology. Runs on consumer hardware, so embedding requires no egress. Model card (vendor-reported): MTEB multilingual mean 61.36, MTEB code NDCG@10 78.68; treated as directional until Stage 13 re-validates on Towel’s own data.',
    costs: 'Inputs are capped at 1,024 subword tokens for embedding (observed locally), so segmenters must stay under it; weights must be bfloat16/float32, not float16; queries need the model card’s task prefixes (SearchQuery/Document, CodeRetrieval for code). Hosted embedders stay implementable behind the same Embedder protocol; Matryoshka truncation to 512/256 is a measured cost option.',
    srcRef: { id: '4-tech-stack-repo-layout-and-conventions', label: '§4 Tech stack' },
  },
  {
    id: 'isolation',
    decision: 'Isolation',
    choice: 'Pooled storage, row-level security, per-collection indexes, mandatory filters',
    why: 'Logical separation is enough for the second app; the standard pool pattern with filter-before-retrieval and source ACL mirroring covers it.',
    costs: 'Approximate search under filters can silently lose recall — countered by per-collection partial HNSW indexes, EXPLAIN tests, and the ANN-recall eval.',
    deferred: 'Silo mode (per-app schema/database, encryption keys, dedicated workers) stays a Stage 15C seam.',
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Multi-tenancy' },
  },
  {
    id: 'scope',
    decision: 'Scope',
    choice: 'The platform injects app and principal; tool schemas never contain them',
    why: 'The agent cannot talk its way out of its scope. Property tests confirm no schema ever carries app_id, principal, or groups.',
    srcRef: { id: '3-system-architecture', label: '§3 Key decisions' },
  },
  {
    id: 'two-texts',
    decision: 'Text for display versus indexing',
    choice: 'text is untouched for display and grep; enriched_text carries context for indexes',
    why: 'Exact search stays exact while semantic search gains context. Context prefixes are deterministic breadcrumbs or small-LLM blurbs, cached by content hash.',
    costs: 'Storage duplication; the plan flags the critique that contextual prefix gains may come mostly from BM25 + reranking.',
    srcRef: { id: '3-system-architecture', label: '§3 Key decisions' },
  },
  {
    id: 'refs',
    decision: 'References',
    choice: 'Name-based and labeled resolved=false',
    why: 'Honest about precision until precise indexers exist. Heuristic references create false positives, so they are labeled and ranking-demoted where needed.',
    deferred: 'SCIP per-language indexing for resolved=true references — Stage 15D.',
    srcRef: { id: 'stage-8-code-profile-and-gitlab-connector', label: 'Stage 8 symbol index' },
  },
  {
    id: 'graph',
    decision: 'Graph',
    choice: 'Regex-extracted link edges, no LLM-built graph in v1',
    why: 'Cost — full GraphRAG took 5,500–7,700 s vs 135 s to index in one comparison, ~8× worse query latency — and evidence that simple facts gain little from graphs.',
    deferred: 'LLM entity extraction + PageRank graph (15B) only if multi-hop failures remain after Stage 11/12.',
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Graph retrieval' },
  },
  {
    id: 'quality',
    decision: 'Quality',
    choice: 'Every feature is flag-gated and measured by Stage 13 evals',
    why: 'Decisions are made on data, not taste. Flags that lower top-3 hit rate by more than 2 points against the Stage 11 baseline default off.',
    srcRef: { id: '3-system-architecture', label: '§3 Key decisions' },
  },
  {
    id: 'reranker',
    decision: 'Reranker placement & choice',
    choice: 'Cross-encoder after global fusion over ≤50 candidates; default BGE Reranker v2-m3, managed options swappable behind the Reranker protocol',
    why: 'Cross-encoders add tens to low hundreds of ms and consistently help; LLM rerankers take seconds and zero-shot ones can underperform fine-tuned rerankers out of domain.',
    costs: 'Long inputs get truncated, which can hurt code units — lengths are capped and tested. Third-party rerankers receive candidate text, so the egress policy is checked before enabling one.',
    srcRef: { id: 'stage-12-reranking-first-move-decomposition-routing-and-trust-rules', label: 'Stage 12' },
  },
  {
    id: 'chat',
    decision: 'Chat ingestion',
    choice: 'One document per thread, markup cleaned, optional Q&A distillation, raw thread kept for grep, deletions reconciled',
    why: 'Indexing by thread beats chronological buckets of ~200 messages; Snyk embedded only distilled questions and fell back to markdown summaries.',
    costs: 'Distilled answers can be wrong — always labeled model-extracted and traced to the raw thread. DMs are never ingested; channel allowlist is explicit.',
    srcRef: { id: 'stage-9-thread-profile-and-slack-connector', label: 'Stage 9' },
  },
  {
    id: 'config',
    decision: 'Onboarding model',
    choice: 'Apps and collections are YAML, validated by Pydantic, applied with towel apps apply; profiles are reusable bundles',
    why: 'The framework contains no app-specific code — everything differing between ctrl-f and app-2 lives in config files.',
    costs: 'Validation must be strict: unknown names error listing valid ones; apply refuses planned components naming the delivering stage.',
    srcRef: { id: '6-configuration-spec', label: '§6 Configuration spec' },
  },
]

export const DEFERRED_DECISIONS = [
  { decision: 'Embedding model per collection', until: 'EmbeddingGemma 2 self-hosted at native 768 dims (decided); Matryoshka truncation to 512/256 held as cost options — Stage 13' },
  { decision: 'Reranker', until: 'BGE Reranker v2-m3 (local), off until it shows uplift — Stages 12 & 13' },
  { decision: 'Chunk sizes per profile', until: 'Defaults in stage specs; Stage 13 sweeps decide' },
  { decision: 'Postgres FTS vs BM25 extension or search engine', until: 'Postgres FTS unless Stage 13 shows a ranking gap' },
  { decision: 'Chat Q&A distillation', until: 'Optional, off by default — Stage 13 cost vs uplift' },
  { decision: 'Link expansion in retrieval', until: 'Off until Stage 13 shows it helps' },
  { decision: 'Authority and recency weights', until: 'Mild bounded defaults; Stage 13 tunes' },
]

export const OPEN_QUESTIONS = [
  { n: 1, q: 'How large is the corpus (repos and lines of code, Confluence pages, chat messages per year, Jira issues)?', why: 'Sets budgets, index sizes, sync times, and whether Postgres alone suffices', needed: 'Stage 0' },
  { n: 2, q: 'Which identity provider will you use, and how do users map to their GitLab, Jira, Slack, and Confluence identities?', why: 'ACL enforcement depends on this mapping; unmapped users fail closed', needed: 'Stage 14A (design earlier)' },
  { n: 3, q: 'Where will this run (cloud or on-premises), and is a GPU available?', why: 'The embedder decision is settled — EmbeddingGemma 2 runs self-hosted on CPU or consumer GPU — but this still sizes ingestion throughput and decides reranker and Stage 15A visual throughput', needed: 'Stage 5' },
  { n: 4, q: 'May code and chat be sent to hosted embedding, rerank, and LLM providers?', why: 'Embeddings are self-hosted, so this no longer gates them; it still gates hosted rerank, LLM answers, and any future hosted embedder swap', needed: 'Stage 5' },
  { n: 5, q: 'Are Confluence and Jira Cloud or Data Center, and what are your Slack plan and API limits (API versus export)?', why: 'Changes connector APIs, pagination, and sync strategy', needed: 'Stages 7, 9, 10' },
  { n: 6, q: 'What does the second app’s content look like (formats, volume, sensitivity), and do its collections fit the structured_doc profile?', why: 'Confirms the §6 profile assumptions and whether visual retrieval is needed', needed: 'Stage 14D' },
  { n: 7, q: 'What are the chat privacy and retention rules, and who owns the channel allowlist?', why: 'Determines what is ingested and how long it is kept', needed: 'Stage 9' },
  { n: 8, q: 'Is the default branch enough for code, and do you want merge requests and issues searchable?', why: 'Decides whether Stage 15E is needed early', needed: 'Stage 8' },
  { n: 9, q: 'Which programming languages dominate your repositories?', why: 'Determines tree-sitter grammars and symbol queries to prioritize', needed: 'Stage 8' },
  { n: 10, q: 'Who reviews and approves golden questions mined from chat, and who owns quality targets?', why: 'Stage 13 depends on human review to keep evals trustworthy', needed: 'Stage 13' },
]

export const RISK_REGISTER = [
  { risk: 'ACL mapping errors leak restricted content', likelihood: 'Medium', impact: 'High', mitigation: 'Fail-closed mapping in every connector, RLS in the database, adversarial isolation harness registered by every retrieval tool, identity mapping tests', where: 'Stages 2, 5, 7–11, 14A' },
  { risk: 'Secrets in code and chat become searchable', likelihood: 'High', impact: 'High', mitigation: 'Redaction before storage, planted-secret tests, scheduled secret-scan of the index', where: 'Stages 8, 9' },
  { risk: 'Prompt injection through retrieved content', likelihood: 'Medium', impact: 'Medium', mitigation: 'Data-block wrapping, strict tool argument validation, scope injected by the platform, live adversarial tests', where: 'Stages 6, 14B' },
  { risk: 'Filtered approximate search loses recall', likelihood: 'Medium', impact: 'Medium', mitigation: 'Per-collection indexes, EXPLAIN tests, ANN-recall eval', where: 'Stages 2, 5, 13' },
  { risk: 'Chat answers are stale or wrong', likelihood: 'High', impact: 'Medium', mitigation: 'Lowest trust order, recency weighting, conflict hints, labeled derived units, dates on every hit', where: 'Stages 9, 12' },
  { risk: 'Source API limits or changes (Slack, Confluence, Jira)', likelihood: 'Medium', impact: 'Medium', mitigation: 'Rate limiters, backoff, export-based backfill, recorded-fixture tests, connector contract tests', where: 'Stages 7, 9, 10' },
  { risk: 'Heuristic code references mislead the agent', likelihood: 'Medium', impact: 'Low', mitigation: 'Explicit resolved=false, precise SCIP indexing as a later option', where: 'Stages 8, 15D' },
  { risk: 'LLM costs grow (contextual prefixes, distillation, agent loops)', likelihood: 'Medium', impact: 'Medium', mitigation: 'Caches keyed by content hash, per-run caps, spend caps, cost in every eval report', where: 'Stages 7, 9, 12, 13, 14B' },
  { risk: 'Over-engineering before evidence', likelihood: 'Medium', impact: 'Medium', mitigation: 'Flags default off until Stage 13 shows uplift; Stage 15 gated on eval evidence', where: 'Stages 12, 13, 15' },
  { risk: 'A coding agent changes frozen contracts silently', likelihood: 'Medium', impact: 'High', mitigation: 'Contract tests, CONTRACT_CHANGE.md process, tags per stage', where: '§7 hand-off protocol' },
  { risk: 'Privacy concerns about ingesting chat', likelihood: 'Medium', impact: 'High', mitigation: 'Explicit channel allowlist, DMs never ingested, retention option, human review of what goes in', where: 'Stage 9' },
]

/** Stack choices from §4 — labeled there as this design effort's
 *  recommendations, not research findings. */
export const STACK_ROWS = [
  { concern: 'Language / tooling', choice: 'Python 3.12, uv, ruff, mypy --strict, pytest', notes: 'Typed Protocol interfaces for every pluggable stage' },
  { concern: 'Models / validation', choice: 'Pydantic v2', notes: 'All config, schemas, and tool I/O' },
  { concern: 'API', choice: 'FastAPI', notes: 'Thin layer over the same service objects the CLI uses' },
  { concern: 'Database', choice: 'Postgres 16 · pgvector · pg_trgm · FTS', notes: 'Row-level security for app and ACL isolation' },
  { concern: 'Lexical ranking', choice: 'ts_rank_cd behind a LexicalIndex interface', notes: 'True BM25 not native — swappable if Stage 13 shows a gap' },
  { concern: 'Job queue', choice: 'Postgres-backed (e.g. procrastinate)', notes: 'Avoids adding Redis in v1' },
  { concern: 'Code parsing', choice: 'tree-sitter via py-tree-sitter', notes: 'AST chunking and symbol extraction' },
  { concern: 'Document parsing', choice: 'Docling behind a Parser interface', notes: 'Vision-first parsers pluggable later' },
  { concern: 'Embeddings', choice: 'Embedder interface; self-hosted EmbeddingGemma 2 (google/embeddinggemma-2)', notes: 'Dense 768-dim, text and code; images/video/audio share the vector space for Stage 15A. No embedding egress; task prefixes required; hosted embedders stay swappable behind the protocol; truncation measured in Stage 13' },
  { concern: 'Agent LLM', choice: 'Claude via Anthropic API, per app', notes: 'Default claude-sonnet-5-5; enrichment on claude-haiku-5-5 with prompt caching' },
  { concern: 'CI', choice: 'GitLab CI', notes: 'Postgres service container for integration tests' },
]

export const STACK_NOTE =
  'These are recommendations from this design effort, not findings from the research; each can be overridden in Stage 0 before code depends on it. (§4)'
