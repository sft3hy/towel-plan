export type Topic = 'infra' | 'retrieval' | 'agent' | 'profile' | 'quality' | 'product'

export interface SubStage {
  id: string // '14A'
  name: string
  focus: string
}

export interface StageMeta {
  n: number
  slug: string
  name: string
  short: string
  dependsOn: number[]
  dependsLabel?: string
  parallelGroup?: 'profiles' // stages that can run concurrently
  phase: PhaseId
  topic: Topic
  visible: string // "Output a human can see" from §7
  gate: string
  tags: string[]
  subStages?: SubStage[]
}

export interface Phase {
  id: PhaseId
  label: string
  blurb: string
  range: [number, number]
}

export type PhaseId = 'foundation' | 'profiles' | 'quality' | 'product' | 'optional'

export const PHASES: Phase[] = [
  {
    id: 'foundation',
    label: 'Foundation — strict chain',
    blurb:
      'A strict dependency chain through Stage 6. Parallelism is unsafe here because the contracts — types, storage, query service, agent tools — are still being frozen.',
    range: [0, 6],
  },
  {
    id: 'profiles',
    label: 'Profiles — parallel',
    blurb:
      'Once Stage 6 passes, four profile stages are independent of each other and can run in parallel with separate agents.',
    range: [7, 10],
  },
  {
    id: 'quality',
    label: 'Integration & quality',
    blurb:
      'Link graph, then quality techniques behind independent flags, then the eval harness that settles every open decision on data.',
    range: [11, 13],
  },
  {
    id: 'product',
    label: 'Product',
    blurb:
      'API, UI, observability, and the second-app onboarding that proves the platform thesis. Split into gated sub-stages 14A–14D.',
    range: [14, 14],
  },
  {
    id: 'optional',
    label: 'Optional extensions',
    blurb:
      'Each extension starts only when Stage 13 evals (or a business requirement) show a need. 15A–15F, each with its own gate.',
    range: [15, 15],
  },
]

export const STAGES: StageMeta[] = [
  {
    n: 0,
    slug: 'stage-0',
    name: 'Scaffold, tooling, CI, fixtures',
    short: 'Scaffold & CI',
    dependsOn: [],
    phase: 'foundation',
    topic: 'infra',
    visible: 'Green CI on an empty package',
    gate: 'make gate-0',
    tags: ['uv', 'pytest markers', 'Postgres 16 + pgvector', 'synthetic fixtures', 'planted_facts.yaml'],
  },
  {
    n: 1,
    slug: 'stage-1',
    name: 'Core types, config loader, registries',
    short: 'Core types',
    dependsOn: [0],
    phase: 'foundation',
    topic: 'infra',
    visible: '`towel apps validate` on the example YAML',
    gate: 'make gate-1',
    tags: ['Pydantic v2 models', 'Protocol interfaces', 'registry + validator', 'FakeEmbedder / FakeLLM', 'AuthContext'],
  },
  {
    n: 2,
    slug: 'stage-2',
    name: 'Storage layer, migrations, ACL and RLS',
    short: 'Storage & RLS',
    dependsOn: [1],
    phase: 'foundation',
    topic: 'infra',
    visible: 'Isolation tests passing against real Postgres',
    gate: 'make gate-2',
    tags: ['forward-only migrations', 'row-level security', 'NOBYPASSRLS role', 'per-collection indexes', 'deterministic IDs'],
  },
  {
    n: 3,
    slug: 'stage-3',
    name: 'Pipeline runtime, job queue, incremental sync',
    short: 'Pipeline & sync',
    dependsOn: [2],
    phase: 'foundation',
    topic: 'infra',
    visible: '`towel sync` ingesting a local folder',
    gate: 'make gate-3',
    tags: ['SKIP LOCKED queue', 'cursor + mark-and-sweep', '30% deletion guard', 'failure isolation', 'idempotent re-sync'],
  },
  {
    n: 4,
    slug: 'stage-4',
    name: 'Virtual filesystem and universal lexical layer',
    short: 'VFS & lexical',
    dependsOn: [3],
    phase: 'foundation',
    topic: 'retrieval',
    visible: '`towel grep`, `towel glob`, `towel read`',
    gate: 'make gate-4',
    tags: ['document_bodies', 'trigram prefilter', 'RE2 matching', 'ts_rank_cd lexical', 'compact renderer v1'],
  },
  {
    n: 5,
    slug: 'stage-5',
    name: 'Embeddings, hybrid retrieval, and the scoped query service',
    short: 'Hybrid + QueryService',
    dependsOn: [4],
    phase: 'foundation',
    topic: 'retrieval',
    visible: '`towel search` with fused results',
    gate: 'make gate-5',
    tags: ['EmbeddingGemma 2 (self-hosted)', 'RRF on ranks', 'per-collection HNSW', 'embedding cache', 'QueryService', 'isolation harness'],
  },
  {
    n: 6,
    slug: 'stage-6',
    name: 'Agent runtime and generated tool surface',
    short: 'Agent runtime',
    dependsOn: [5],
    phase: 'foundation',
    topic: 'agent',
    visible: '`towel ask` with citations on a toy collection',
    gate: 'make gate-6',
    tags: ['config-generated tools', 'budgets + stop reasons', 'evidence ledger', 'citation validator', 'injection hygiene'],
  },
  {
    n: 7,
    slug: 'stage-7',
    name: 'structured_doc profile, upload and Confluence connectors',
    short: 'structured_doc',
    dependsOn: [6],
    parallelGroup: 'profiles',
    phase: 'profiles',
    topic: 'profile',
    visible: 'Docs searchable with outline navigation',
    gate: 'make gate-7',
    tags: ['heading_tree segmenter', 'outline tools', 'contextual_prefix', 'fail-closed ACL', 'Docling + Confluence HTML'],
  },
  {
    n: 8,
    slug: 'stage-8',
    name: 'code profile and GitLab connector',
    short: 'code',
    dependsOn: [6],
    parallelGroup: 'profiles',
    phase: 'profiles',
    topic: 'profile',
    visible: 'Symbol and trigram search over real repos',
    gate: 'make gate-8',
    tags: ['AST chunks (cAST)', 'trigram grep', 'symbol index', 'code tokenizer', 'secret redaction'],
  },
  {
    n: 9,
    slug: 'stage-9',
    name: 'thread profile and Slack connector',
    short: 'thread',
    dependsOn: [6],
    parallelGroup: 'profiles',
    phase: 'profiles',
    topic: 'profile',
    visible: 'Thread-level chat search',
    gate: 'make gate-9',
    tags: ['one doc per thread', 'DMs never ingested', 'optional qa_distill', 'API + export modes', 'lookback window'],
  },
  {
    n: 10,
    slug: 'stage-10',
    name: 'ticket profile and Jira connector',
    short: 'ticket',
    dependsOn: [6],
    parallelGroup: 'profiles',
    phase: 'profiles',
    topic: 'profile',
    visible: 'Ticket search with field filters',
    gate: 'make gate-10',
    tags: ['overview + comment units', 'attribute filters', 'JQL incremental sync', 'ADF parser', 'security levels fail closed'],
  },
  {
    n: 11,
    slug: 'stage-11',
    name: 'Link graph',
    short: 'Link graph',
    dependsOn: [7, 8, 9, 10],
    dependsLabel: 'Stages 7–10 (consumes all four profiles)',
    phase: 'quality',
    topic: 'retrieval',
    visible: 'Cross-source link traversal tool',
    gate: 'make gate-11',
    tags: ['regex extractors', 'dangling + resolve', 'visibility rules', 'follow_links ≤ depth 2', 'expansion off by default'],
  },
  {
    n: 12,
    slug: 'stage-12',
    name: 'Reranking, first-move decomposition, routing, and trust rules',
    short: 'Rerank & routing',
    dependsOn: [11],
    phase: 'quality',
    topic: 'agent',
    visible: 'Measurable quality uplift on evals',
    gate: 'make gate-12',
    tags: ['cross-encoder + fallback', 'bounded authority/recency', 'deterministic router', 'first-move plan JSON', 'flags + egress policy'],
  },
  {
    n: 13,
    slug: 'stage-13',
    name: 'Eval harness and golden sets',
    short: 'Eval harness',
    dependsOn: [6],
    dependsLabel: 'Stage 6 for the skeleton; Stage 12 for the full ablation matrix',
    phase: 'quality',
    topic: 'quality',
    visible: 'Scorecard report',
    gate: 'make gate-13',
    tags: ['golden.yaml schema', 'recall@k / MRR / nDCG', 'calibrated judge', 'ablation matrix', 'regression gate'],
  },
  {
    n: 14,
    slug: 'stage-14',
    name: 'API, upload UI, second-app onboarding, observability',
    short: 'Product & 2nd app',
    dependsOn: [12, 13],
    phase: 'product',
    topic: 'product',
    visible: 'Both apps running side by side',
    gate: 'make gate-14a … gate-14d',
    tags: ['SSE ask endpoint', 'OIDC + identity map', 'webhooks + OTel', 'drag-and-drop UI', 'zero-core-change proof'],
    subStages: [
      { id: '14A', name: 'HTTP API, authentication, identity mapping', focus: 'Identity comes only from credentials, never request content.' },
      { id: '14B', name: 'Webhooks, admin, observability, hardening', focus: 'Fresh indexes, operable system, closed basic gaps.' },
      { id: '14C', name: 'Web UI with drag-and-drop upload', focus: 'The user-facing experience from the original brief.' },
      { id: '14D', name: 'Second-app onboarding & extensibility proof', focus: 'A new app is configuration — and apps never confuse each other.' },
    ],
  },
  {
    n: 15,
    slug: 'stage-15',
    name: 'Optional extensions',
    short: 'Optional (15A–F)',
    dependsOn: [14],
    dependsLabel: 'Each starts only when Stage 13 evals show a need',
    phase: 'optional',
    topic: 'product',
    visible: 'Only if evals justify',
    gate: 'make gate-15a … (mini-stage per extension)',
    tags: ['visual_doc', 'entity_graph', 'silo isolation', 'SCIP refs', 'MRs & branches', 'more connectors'],
    subStages: [
      { id: '15A', name: 'visual_doc profile', focus: 'EmbeddingGemma 2 multimodal mode first — page images/video/audio embedded into the same 768-dim space as text — then ColPali-style late interaction if that underperforms on charts.' },
      { id: '15B', name: 'entity_graph profile', focus: 'LLM entity extraction + PageRank-style graph if multi-hop still fails.' },
      { id: '15C', name: 'Silo isolation', focus: 'Per-app schema/database, encryption keys, dedicated workers.' },
      { id: '15D', name: 'Precise code references', focus: 'SCIP indexers replace heuristic resolved=false references.' },
      { id: '15E', name: 'GitLab MRs, issues, commits, branches', focus: 'Why-did-code-change questions and non-default branches.' },
      { id: '15F', name: 'More connectors and formats', focus: 'Drive, SharePoint, Notion, email — Connector protocol + fixtures.' },
    ],
  },
]

export function stageByN(n: number): StageMeta | undefined {
  return STAGES.find((s) => s.n === n)
}

export const TOPIC_LABEL: Record<Topic, string> = {
  infra: 'Infrastructure',
  retrieval: 'Retrieval',
  agent: 'Agent',
  profile: 'Source profile',
  quality: 'Quality & evals',
  product: 'Product',
}
