/**
 * Search & indexing content. Numeric figures in `RESEARCH_FIGURES` are
 * quoted from §2's research table with their original provenance labels —
 * they are NOT Towel benchmarks. Towel's own numbers arrive in Stage 13.
 */

export type StackStatus = 'day-one' | 'stage' | 'flag' | 'deferred'

export interface StackLayer {
  id: string
  label: string
  status: StackStatus
  stage: string
  color: 'cyan' | 'violet' | 'amber' | 'neutral'
  body: string
  tools: string[]
  srcRef: { id: string; label: string }
}

export const RETRIEVAL_STACK: StackLayer[] = [
  {
    id: 'vfs',
    label: 'Virtual filesystem — exact match',
    status: 'day-one',
    stage: 'Stage 4 · day one for any collection',
    color: 'cyan',
    body: 'Every collection becomes a read-only tree of normalized text. grep (literal + regex via trigram prefilter and RE2), glob, read, ls behave identically across all collections — including ones that do not exist yet — so any new collection is useful before embeddings or rerankers are configured.',
    tools: ['grep', 'glob', 'read', 'ls'],
    srcRef: { id: 'virtual-filesystem', label: '§3 Virtual filesystem' },
  },
  {
    id: 'lexical',
    label: 'Lexical — ranked keywords',
    status: 'day-one',
    stage: 'Stage 4',
    color: 'cyan',
    body: 'Postgres full-text search (ts_rank_cd) over units.tsv behind a LexicalIndex interface. Quoted phrases, -term negation, path:/collection:/after:/before: filters. Code swaps in a tokenizer splitting camelCase / snake_case / kebab so userId and user_id reach getUserByID. True BM25 is not native to Postgres — swap path is a Stage 13 decision.',
    tools: ['search · lexical'],
    srcRef: { id: '4-tech-stack-repo-layout-and-conventions', label: '§4 Lexical ranking' },
  },
  {
    id: 'dense',
    label: 'Dense — semantic vectors',
    status: 'stage',
    stage: 'Stage 5',
    color: 'cyan',
    body: 'Self-hosted EmbeddingGemma 2 (google/embeddinggemma-2) at native 768 dims is the platform default; one embedding model per collection, fixed in config; per-collection partial HNSW indexes cast to the collection’s dimension so one collection’s vectors never affect another’s recall. Indexes enriched_text; queries embed with the model card’s SearchQuery prefix (code collections use CodeRetrieval). Cached by (model, content_hash) — unchanged units are never re-embedded. The same model natively embeds images, video, and audio into the shared space, which Stage 15A builds on.',
    tools: ['search · dense'],
    srcRef: { id: 'stage-5-embeddings-hybrid-retrieval-and-the-scoped-query-service', label: 'Stage 5' },
  },
  {
    id: 'hybrid',
    label: 'Hybrid — RRF fusion',
    status: 'stage',
    stage: 'Stage 5',
    color: 'cyan',
    body: 'The retrieval pattern that survives in production: lexical + dense run concurrently (default 50 candidates each), fused on ranks with reciprocal rank fusion — never on raw scores, which are not comparable — per collection, then across collections so a large collection cannot dominate. Each hit keeps retriever provenance.',
    tools: ['search · hybrid'],
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Hybrid + rerank' },
  },
  {
    id: 'structure',
    label: 'Structure-aware retrieval',
    status: 'stage',
    stage: 'Stages 7–10',
    color: 'violet',
    body: 'Per-profile segmenters and navigation: heading trees with get_outline / read_section for prose; AST chunks with find_symbol / find_references for code; one-document-per-thread with search_threads for chat; overview + comment units with structured filters for tickets.',
    tools: ['get_outline', 'read_section', 'find_symbol', 'find_references', 'search_threads', 'search_tickets'],
    srcRef: { id: 'pipeline-and-profiles', label: '§3 Pipeline and profiles' },
  },
  {
    id: 'graph',
    label: 'Link traversal',
    status: 'stage',
    stage: 'Stage 11',
    color: 'violet',
    body: 'Lightweight regex-extracted edges — Jira keys, GitLab MR URLs, repo names, file paths, structured issue links — with resolved/dangling states and visibility rules. follow_links ≤ depth 2, hub-capped. Link expansion stays off until Stage 13 shows it helps multi-hop.',
    tools: ['follow_links'],
    srcRef: { id: 'stage-11-link-graph', label: 'Stage 11' },
  },
  {
    id: 'rerank',
    label: 'Rerank + trust weighting',
    status: 'flag',
    stage: 'Stage 12 · independent flags',
    color: 'amber',
    body: 'Cross-encoder (default BGE Reranker v2-m3; managed options swappable) over the fused top 50; timeout falls back to fused order, never fails the search. Then final = rerank_score × authority_weight × recency_factor, each bounded ±15% so relevance dominates; every component visible in --explain.',
    tools: ['search --rerank'],
    srcRef: { id: 'stage-12-reranking-first-move-decomposition-routing-and-trust-rules', label: 'Stage 12' },
  },
  {
    id: 'deferred',
    label: 'Deferred layers',
    status: 'deferred',
    stage: 'Stage 15 · if evals justify',
    color: 'neutral',
    body: 'Two candidates in order: EmbeddingGemma 2 multimodal mode (the chosen embedder already encodes page images, video, and audio into the same 768-dim space as text — media become ordinary unit_embeddings, searchable by the existing dense path), and, if that underperforms on charts, ColPali-style late-interaction visual page retrieval (needs GPU). LLM-built entity graphs (HippoRAG-style), precise SCIP code references, merge-request ingestion. Profile slots are reserved; none ship on evidence-free decisions.',
    tools: ['search_pages', 'search_entities'],
    srcRef: { id: 'stage-15-optional-extensions', label: 'Stage 15' },
  },
]

// ---------------------------------------------------------------------------
// Research figures (provenance preserved from §2; vendor-reported = directional)
// ---------------------------------------------------------------------------

export interface FigurePoint {
  label: string
  value: number
  note?: string
  vendorReported?: boolean
}

export interface ResearchFigure {
  id: string
  title: string
  unit: string
  provenance: string
  takeaway: string
  decision: string
  stage: string
  points: FigurePoint[]
  srcRef: { id: string; label: string }
  invertBetter?: boolean // for bar length interpretation notes
}

export const RESEARCH_FIGURES: ResearchFigure[] = [
  {
    id: 'contextual',
    title: 'Top-20 retrieval failures, step by step',
    unit: '% failure (lower is better)',
    provenance: 'Anthropic-reported (Contextual Retrieval). A critique notes much of the gain comes from standard BM25 and reranking rather than the prefix alone. Directional — Towel’s own numbers land in Stage 13.',
    takeaway: 'Lexical context + reranking stack compounds; each layer adds on top of the last.',
    decision: 'Context prefix before BOTH indexes; reranker behind an interface; fusion is RRF.',
    stage: 'Stages 5 · 7 · 12',
    invertBetter: true,
    points: [
      { label: 'Baseline', value: 5.7, note: '5.7% top-20 failures' },
      { label: '+ contextual embeddings', value: 3.7, note: '−35%' },
      { label: '+ contextual BM25', value: 2.9, note: '−49%' },
      { label: '+ reranking', value: 1.9, note: '−67%' },
    ],
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Contextual Retrieval' },
  },
  {
    id: 'graph',
    title: 'GraphRAG vs chunk RAG — gains must pay their cost',
    unit: 'score (higher is better) · index time seconds',
    provenance: 'GraphRAG-Bench figures quoted in §2. Directional; the plan deliberately ships a cheap link graph first and gates full graphs behind Stage 13 evidence.',
    takeaway: 'Simple fact retrieval is a near tie; graphs lead ~10 pts on complex reasoning, ~13 on summarization — at ~40× the index time and ~8× the query latency.',
    decision: 'Regex-extracted link graph (Stage 11). No LLM-built graph in v1.',
    stage: 'Stage 11 · 15B',
    points: [
      { label: 'Fact retrieval · chunks', value: 60.9 },
      { label: 'Fact retrieval · graph', value: 60.1, note: 'near tie' },
    ],
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Graph retrieval' },
  },
]

export const RESEARCH_COST_POINTS = [
  { label: 'Standard RAG index time', value: '135 s', detail: 'one comparison, §2' },
  { label: 'Full GraphRAG index time', value: '5,500–7,700 s', detail: '~40× slower, same comparison' },
  { label: 'GraphRAG per-query latency', value: '~8× worse', detail: '§2 quote' },
  { label: 'HippoRAG multi-hop gains', value: 'up to +20%', detail: 'at far lower cost than iterative retrieval' },
  { label: 'Cross-encoder overhead', value: 'tens–low hundreds of ms', detail: 'LLM rerankers can take seconds' },
  { label: 'Trigram pre-filter grep at 1K files', value: '~110× faster literal grep', detail: 'vendor-reported code search engine' },
]

// ---------------------------------------------------------------------------
// RRF worked example (illustrative only — not a measured result)
// ---------------------------------------------------------------------------

export interface RrfList {
  name: string
  hits: Array<{ id: string; doc: string }>
}

export const RRF_EXAMPLE = {
  query: 'ECONNRESET at pool.acquire()',
  k: 60,
  lexical: {
    name: 'Lexical (ts_rank_cd)',
    hits: [
      { id: 'A', doc: '/gitlab/payments-service/src/pool.py' },
      { id: 'B', doc: '/confluence/ENG/deploy-runbook.md' },
      { id: 'C', doc: '/chat/infra/2026-09-14-thread-abc.md' },
    ],
  } satisfies RrfList,
  dense: {
    name: 'Dense (HNSW)',
    hits: [
      { id: 'C', doc: '/chat/infra/2026-09-14-thread-abc.md' },
      { id: 'D', doc: '/jira/PAY-1423.md' },
      { id: 'A', doc: '/gitlab/payments-service/src/pool.py' },
    ],
  } satisfies RrfList,
  fused: [
    { id: 'A', score: '1/61 + 1/63 = 0.0323', why: 'rank 1 lexical + rank 3 dense' },
    { id: 'C', score: '1/63 + 1/61 = 0.0323', why: 'rank 3 lexical + rank 1 dense — tie broken deterministically' },
    { id: 'B', score: '1/62 = 0.0161', why: 'lexical only' },
    { id: 'D', score: '1/62 = 0.0161', why: 'dense only' },
  ],
}

// ---------------------------------------------------------------------------
// Segmentation by source (§2 conclusion 3, §3 profile table)
// ---------------------------------------------------------------------------

export const SEGMENTATION_ROWS = [
  {
    profile: 'code',
    unit: 'AST declarations — functions, classes, methods; oversize splits recursively; small neighbors merge',
    defaults: 'max 800 · min 60 tokens',
    locator: 'path · start_line · end_line · symbol · commit',
    evidence: 'cAST: AST chunking beat fixed-size line chunking on RepoEval and SWE-bench',
    stage: 'Stage 8',
  },
  {
    profile: 'structured_doc',
    unit: 'Heading-tree sections split at paragraph boundaries; tiny siblings merged; tables never split mid-row (header repeats)',
    defaults: 'max 500 · min 80 tokens',
    locator: 'heading_path · page · anchor',
    evidence: 'PageIndex-style navigation within a document needs hierarchical structure (vendor-reported)',
    stage: 'Stage 7',
  },
  {
    profile: 'thread',
    unit: 'One unit per thread ≤ max; longer threads split by message groups with one-message overlap + repeated header',
    defaults: 'max 700 tokens',
    locator: 'channel · thread_ts · message_range',
    evidence: 'Indexing by thread beats chronological buckets of ~200 messages (Snyk)',
    stage: 'Stage 9',
  },
  {
    profile: 'ticket',
    unit: 'Overview unit (header + summary + description) plus comment units grouped to the token maximum',
    defaults: 'section = description | comment:N-M',
    locator: 'key · section · updated_at',
    evidence: 'Search by meaning AND structure: status, assignee, labels, dates',
    stage: 'Stage 10',
  },
]
