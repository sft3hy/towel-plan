export interface MetricCardData {
  value: string
  unit?: string
  label: string
  detail: string
  status: 'initial-target' | 'hard-requirement' | 'invariant' | 'proposed-target'
  stage: string
  srcRef: { id: string; label: string }
}

/** Success criteria from §1 (Goals/Success criteria) and §8 (Budgets).
 *  Every value is a plan-defined target — none are measured results. */
export const SUCCESS_METRICS: MetricCardData[] = [
  {
    value: '80%',
    label: 'Top-5 source recall on ctrl-f golden set',
    detail:
      'Correct citations on real engineering questions at or above the threshold set in Stage 13. Measured separately from answer quality.',
    status: 'initial-target',
    stage: 'Stage 13',
    srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Success criteria' },
  },
  {
    value: '0',
    label: 'Cross-app / cross-ACL leakage',
    detail:
      'No leakage in an automated adversarial test suite. Enforced in the database before retrieval — never in the prompt.',
    status: 'hard-requirement',
    stage: 'Stages 5 & 14',
    srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Success criteria' },
  },
  {
    value: '0',
    label: 'Core package changes for app #2',
    detail:
      'Onboarding the second app requires zero changes to core packages — only config, plus at most one new connector.',
    status: 'hard-requirement',
    stage: 'Stage 14D',
    srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Success criteria' },
  },
  {
    value: '<1.5 s',
    label: 'p95 hybrid search latency',
    detail: 'Search-tool latency target for hybrid search on the ctrl-f corpus at the target size (corpus size is an open question, §9).',
    status: 'proposed-target',
    stage: 'Stage 5',
    srcRef: { id: '8-dependency-map-risks-and-budgets', label: '§8 Budgets & targets' },
  },
  {
    value: '<500 ms',
    label: 'p95 grep latency',
    detail: 'Exact-match latency target on a 10,000-document collection; recorded against a generous assert bound in CI.',
    status: 'proposed-target',
    stage: 'Stage 4',
    srcRef: { id: '8-dependency-map-risks-and-budgets', label: '§8 Budgets & targets' },
  },
  {
    value: '0 calls',
    label: 'Embedding calls on unchanged re-sync',
    detail: 'Ingestion is idempotent: content hashes decide, and a re-sync on unchanged input writes nothing — zero row writes too.',
    status: 'invariant',
    stage: 'Stages 3 & 5',
    srcRef: { id: '8-dependency-map-risks-and-budgets', label: '§8 Budgets & targets' },
  },
]

export interface Principle {
  icon: 'search' | 'layers' | 'scissors' | 'quote' | 'shield' | 'sliders'
  title: string
  body: string
  srcRef: { id: string; label: string }
}

/** The four research conclusions plus the platform mechanics they drive (§1–§3). */
export const PRINCIPLES: Principle[] = [
  {
    icon: 'search',
    title: 'Tool-driven retrieval, not a fixed pipeline',
    body: 'The agent operates a toolbox — grep, glob, lexical, hybrid, outline, symbols, links, reads — plans, inspects results, reformulates, and stops when evidence is grounded, under a hard budget.',
    srcRef: { id: '1-purpose-scope-and-thesis', label: '§1 Thesis' },
  },
  {
    icon: 'layers',
    title: 'Hybrid survives in production',
    body: 'Lexical + dense fused by reciprocal rank fusion, cross-encoder reranked over the top ~50, structure-aware chunking, continuous evaluation. Ranks fuse; incomparable scores never sum.',
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Hybrid + rerank' },
  },
  {
    icon: 'scissors',
    title: 'Source-aware segmentation',
    body: 'Each source type gets its own segmenter: AST chunks for code, threads for chat, heading trees for docs, overview + comment groups for tickets. One segmenter fits none.',
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Segmentation' },
  },
  {
    icon: 'shield',
    title: 'Isolation before retrieval',
    body: 'App, collection, and ACL restrictions are enforced in the database — row-level security on every retrievable table — before any result is produced. Never in the prompt.',
    srcRef: { id: '2-research-findings-that-drive-the-design', label: '§2 Multi-tenancy' },
  },
  {
    icon: 'quote',
    title: 'Every answer is grounded and dated',
    body: 'Every hit carries a citation id with its locator — file + lines, heading path, thread range, ticket section — collection, and modified date. Unknown ids are stripped; no valid citation means ungrounded.',
    srcRef: { id: 'stage-6-agent-runtime-and-generated-tool-surface', label: 'Stage 6 Evidence ledger' },
  },
  {
    icon: 'sliders',
    title: 'Configuration, not code',
    body: 'A collection is a profile — a named bundle of connector, parser, segmenter, enrichers, indexes, and tools — declared in YAML. New data types are new combinations of existing parts.',
    srcRef: { id: '6-configuration-spec', label: '§6 Configuration spec' },
  },
]

export interface HierarchyLevel {
  term: string
  oneLiner: string
  detail: string
  example: string
  color: string
}

/** Platform → App → Collection → Document → Unit (§3 Hierarchy). */
export const HIERARCHY: HierarchyLevel[] = [
  {
    term: 'Platform',
    oneLiner: 'One system, many apps',
    detail: 'The shared engine: storage, pipeline, query service, agent runtime. No app-specific code lives here.',
    example: 'Towel',
    color: 'neutral',
  },
  {
    term: 'App',
    oneLiner: 'Tenant boundary',
    detail: 'Owns an agent configuration — prompt, model, trust order, budgets — and a set of collections. Search never spans apps.',
    example: 'ctrl-f · app-2',
    color: 'violet',
  },
  {
    term: 'Collection',
    oneLiner: 'Retrieval unit',
    detail: 'A named set of documents ingested through one profile from one source. One embedding model per collection, its own indexes.',
    example: 'gitlab · confluence · jira · chat · knowledge_doc',
    color: 'cyan',
  },
  {
    term: 'Document',
    oneLiner: 'Normalized source object',
    detail: 'An ACL, a virtual path (vpath) in the filesystem, attributes, a content hash, and a modified date.',
    example: '/gitlab/payments-service/src/auth.py',
    color: 'amber',
  },
  {
    term: 'Unit',
    oneLiner: 'Retrievable segment',
    detail: 'A segment with a profile-specific locator that serves as its citation anchor. text stays exact for grep; enriched_text carries context for indexes.',
    example: 'lines 120–184 · heading “Deploy steps” · comment 3–5',
    color: 'green',
  },
]

export interface CompareRow {
  aspect: string
  fixed: string
  agent: string
}

/** Fixed pipeline vs agent-directed retrieval — from §1 thesis and Stage 6/12 behavior. */
export const FIXED_VS_AGENT: CompareRow[] = [
  {
    aspect: 'Search plan',
    fixed: 'One retrieve-then-generate pipeline; the same shape for every query.',
    agent: 'The agent chooses among grep, glob, lexical, dense, hybrid, outline, symbols, and links per query shape — routing rules schedule obvious ones.',
  },
  {
    aspect: 'Iteration',
    fixed: 'Single pass: retrieve top-k, stuff the prompt, generate.',
    agent: 'Plan → call tools → inspect evidence → reformulate or expand → re-retrieve, until grounded evidence or a hard budget.',
  },
  {
    aspect: 'Query types',
    fixed: 'Identical treatment for error strings, identifiers, how-tos, and incident history.',
    agent: 'Identifier-shaped queries prefer grep / find_symbol; runbooks prefer Confluence; “why did we” prefers chat / Jira (routing hints).',
  },
  {
    aspect: 'Evidence handling',
    fixed: 'Retrieved chunks silently stuffed; no accounting.',
    agent: 'Evidence ledger: every hit gets a citation id; a validator strips unknown ids and flags unground answers.',
  },
  {
    aspect: 'Stopping',
    fixed: 'Ends after k results.',
    agent: 'Stops on final answer, max_steps, max_tool_tokens, or wall clock — a forced final answer states what is missing.',
  },
]

export const VFS_SAMPLES = [
  '/confluence/ENG/deploy-runbook.md',
  '/chat/infra/2026-09-14-thread-abc.md',
  '/gitlab/payments-service/src/auth.py',
  '/jira/PAY-1423.md',
]
