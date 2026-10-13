/**
 * Evaluation & acceptance criteria (Stage 13 + §1 success criteria +
 * §8 budgets). Everything here is a plan-defined target or harness
 * structure — no measured results exist yet.
 */

export interface EvalFamily {
  id: string
  title: string
  color: 'cyan' | 'violet' | 'amber' | 'green' | 'neutral'
  metric: string
  requiresLLM: boolean
  detail: string
}

export const EVAL_FAMILIES: EvalFamily[] = [
  {
    id: 'retrieval',
    title: 'Retrieval quality',
    color: 'cyan',
    metric: 'recall@1/3/5/10 · MRR · nDCG@10',
    requiresLLM: false,
    detail: 'Graded relevance 0–2, broken down by question type, collection, and tag. No LLM required — cheap enough to run on every commit.',
  },
  {
    id: 'answer',
    title: 'Answer quality & citations',
    color: 'violet',
    metric: 'citation recall · precision · groundedness · correctness vs answer_points · abstention · stale-source usage',
    requiresLLM: true,
    detail: 'Judged on agent runs. A correct answer must contain the listed answer_points and must not follow must_not superseded instructions.',
  },
  {
    id: 'latency',
    title: 'Latency & cost',
    color: 'amber',
    metric: 'p50 / p95 per tool · steps · tokens · cost per question',
    requiresLLM: false,
    detail: 'Recorded in every run and every stage report. Targets from §8: hybrid < 1.5 s p95, grep < 500 ms p95, rerank adds tens–hundreds of ms, first move adds 1–3 s.',
  },
  {
    id: 'security',
    title: 'Security & isolation',
    color: 'green',
    metric: 'leakage count = 0 (hard)',
    requiresLLM: false,
    detail: 'A question run as an unauthorized principal is a hard failure if any restricted source appears in results or citations.',
  },
  {
    id: 'regression',
    title: 'Regression gating',
    color: 'amber',
    metric: 'compare A/B with bootstrap CIs · gate exits non-zero past threshold',
    requiresLLM: false,
    detail: 'The Stage 13 baseline scorecard anchors every later gate. Flags that lower top-3 hit rate by more than 2 points against baseline default off.',
  },
  {
    id: 'extensibility',
    title: 'Extensibility & onboarding',
    color: 'neutral',
    metric: 'zero core changes for app #2 · recipes run by tests',
    requiresLLM: false,
    detail: 'CI diff check proves onboarding touched nothing under core, storage, pipeline, retrieval, or agent.',
  },
]

export const TARGET_ROWS = [
  { metric: 'Top-5 source recall on the ctrl-f golden set', target: '80% (initial)', measured: 'Stage 13', kind: 'proposed-target' as const },
  { metric: 'Cross-app or cross-ACL leakage in adversarial suites', target: 'zero', measured: 'Every stage', kind: 'hard-requirement' as const },
  { metric: 'p95 grep latency · 10,000-document collection', target: 'under 500 ms', measured: 'Stage 4', kind: 'proposed-target' as const },
  { metric: 'p95 hybrid search latency (before rerank)', target: 'under 1.5 s', measured: 'Stage 5', kind: 'proposed-target' as const },
  { metric: 'Added latency from rerank', target: 'tens to low hundreds of ms', measured: 'Stage 12', kind: 'proposed-target' as const },
  { metric: 'Added latency from first-move decomposition', target: '1–3 s · skipped for trivial queries', measured: 'Stage 12', kind: 'proposed-target' as const },
  { metric: 'Unchanged re-sync', target: 'zero embedding calls · zero row writes', measured: 'Stages 3 & 5', kind: 'invariant' as const },
  { metric: 'New-code coverage', target: '≥ 85% per stage', measured: 'Definition of done', kind: 'invariant' as const },
  { metric: 'follow_links depth-2 p95 · 100,000-edge graph', target: 'under 300 ms (recorded)', measured: 'Stage 11', kind: 'proposed-target' as const },
]

export const GOLDEN_SCHEMA_ROWS = [
  { field: 'id', desc: 'Stable question id' },
  { field: 'question', desc: 'The question asked' },
  { field: 'type', desc: 'lookup · how-to · why · troubleshoot · multi-hop · negative' },
  { field: 'expected', desc: 'Acceptable sources with graded relevance 0–2, optional locator hints' },
  { field: 'answer_points', desc: 'Facts a correct answer must contain' },
  { field: 'must_not', desc: 'e.g. superseded instructions that must not appear' },
  { field: 'as_principal', desc: 'Principal to run as, for ACL cases' },
  { field: 'exclude_docs', desc: 'Leave-one-out: never retrieve these; metrics computed without them' },
  { field: 'expect_abstain', desc: 'Negatives: the right answer is “I cannot ground this”' },
  { field: 'tags · version', desc: 'Grouping + dataset versioning; 30% held-out split reserved for final decisions' },
]

export const ABLATION_FLAGS = [
  { flag: 'lexical only', note: 'Exact-match floor' },
  { flag: 'dense only', note: 'Semantic floor' },
  { flag: 'hybrid (RRF)', note: 'Baseline from Stage 5' },
  { flag: '+ rerank', note: 'Cross-encoder over fused top 50' },
  { flag: '+ authority', note: 'trust_order weights, bounded ±15%' },
  { flag: '+ recency', note: 'per-profile half-life, bounded ±15%' },
  { flag: '+ link expansion', note: 'Neighbors as secondary candidates' },
  { flag: '+ first_move', note: 'Decomposition-seeded evidence' },
]

export const HYGIENE = [
  'Golden sets are versioned; mined-chat candidates require human review before merging (with a version bump).',
  'Real golden sets contain internal content — kept out of the public repository and out of any prompt used to build the system.',
  'Judges are calibrated against human labels; low agreement is flagged in every report; the judge model should differ from the agent’s model.',
  'Small question sets give wide intervals — single deltas are not over-read.',
  'make eval-smoke: the deterministic fake-backed subset completes in under two minutes in CI.',
]
