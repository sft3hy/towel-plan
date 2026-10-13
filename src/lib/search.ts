import { headings, planRaw } from './plan'
import { STAGES } from '../content/stages'

/**
 * Client-side search over pages, implementation stages, plan sections,
 * glossary terms, tools, and key technical vocabulary. All content is
 * bundled locally — no network requests at runtime.
 */

export type SearchKind = 'Page' | 'Stage' | 'Plan section' | 'Glossary' | 'Term'

export interface SearchDoc {
  title: string
  kind: SearchKind
  to: string
  snippet: string
  haystack: string
}

const GLOSSARY: Array<[string, string]> = [
  ['App', 'Tenant boundary that owns an agent configuration and a set of collections (for example ctrl-f)'],
  ['Collection', 'Retrieval unit inside an app, ingested through one profile from one source'],
  ['Profile', 'Named bundle of parser, segmenters, enrichers, indexes, retrieval settings, and tools'],
  ['Document', 'Normalized source object with an ACL, a virtual path, and attributes'],
  ['Unit', 'Retrievable segment of a document, carrying a locator used as its citation'],
  ['Locator', 'Profile-specific citation anchor (file and lines, heading path, thread range, ticket section)'],
  ['vpath', 'Path of a document in the virtual filesystem, e.g. /gitlab/repo/src/auth.py'],
  ['text vs enriched_text', 'Original unit text (display, grep) vs text with context prefix (indexing)'],
  ['AuthContext', 'App, principal, and groups derived from credentials and injected by the platform'],
  ['Service context', 'Ingestion-only context that bypasses ACL filtering but never the app boundary'],
  ['RLS', 'Postgres row-level security enforcing app and ACL predicates inside the database'],
  ['RRF', 'Reciprocal rank fusion: merges ranked lists using ranks instead of incomparable scores'],
  ['Derived unit', 'A model-generated unit (Q&A or summary) that always cites the raw source it came from'],
  ['Evidence ledger', 'Per-run record of every hit shown to the agent, with citation ids'],
  ['First move', 'Optional initial step that decomposes the question and seeds evidence before the agent loop'],
  ['Fail closed', 'When permissions cannot be determined, restrict access rather than allow it'],
  ['Pool and silo', 'Shared storage with mandatory filters vs dedicated storage per tenant'],
  ['Gate', 'make gate-N, the test run that must pass before the next stage begins'],
]

const TOOLS: Array<[string, string, string]> = [
  ['grep', 'Literal and regex exact-match search over document bodies with trigram prefilter and RE2 verification', '#/stage/4'],
  ['glob', 'Path pattern matching over the virtual filesystem: *, **, ?, brace expansion', '#/stage/4'],
  ['read / ls', 'Line-accurate reads and directory listings from the virtual filesystem', '#/stage/4'],
  ['search (lexical)', 'Ranked keyword search via Postgres ts_rank_cd with phrases, negation, and filters', '#/stage/4'],
  ['search (dense)', 'Vector search over enriched_text using a per-collection partial HNSW index', '#/stage/5'],
  ['hybrid search', 'Lexical + dense run concurrently, fused per-collection then across collections by RRF', '#/stage/5'],
  ['find_symbol / find_references', 'Symbol lookup and name-based references from the tree-sitter symbol index, labeled resolved=false', '#/stage/8'],
  ['get_outline / read_section', 'Heading-tree navigation for structured documents', '#/stage/7'],
  ['search_threads / read_thread', 'Thread-scoped chat search with channel, date, and author filters', '#/stage/9'],
  ['search_tickets / get_ticket', 'Ticket search by meaning plus structure: status, type, labels, assignee, dates', '#/stage/10'],
  ['follow_links', 'Cross-collection link traversal, depth ≤ 2, with visibility rules and fan-out caps', '#/stage/11'],
]

function buildIndex(): SearchDoc[] {
  const docs: SearchDoc[] = []

  const pages: Array<[string, string, string]> = [
    ['Overview', 'What Towel is, agent-first thesis, hierarchy, principles, success criteria', '#/'],
    ['Architecture explorer', 'Interactive layered views: system context, ingestion, retrieval loop, security, evaluation', '#/architecture'],
    ['Agentic lifecycle', 'The agent loop: first move, tool selection, evidence inspection, reformulation, budgets, stopping', '#/lifecycle'],
    ['Search & indexing', 'Retrieval stack: VFS grep/glob, lexical, dense, RRF fusion, rerank, segmentation per source', '#/retrieval'],
    ['Implementation roadmap', 'Every stage 0–15 with dependencies, gates, parallel groups, and full stage detail', '#/roadmap'],
    ['Data model & profiles', 'Apps, collections, documents, units, side indexes, locators, and profile matrix', '#/data'],
    ['Security & isolation', 'RLS before retrieval, scope injection, fail-closed ACLs, adversarial suites', '#/security'],
    ['Evaluation & acceptance', 'Golden sets, metrics, judge calibration, ablation matrix, regression gates', '#/evaluation'],
    ['Decision record', 'Key architectural decisions, alternatives, costs, deferred options, open questions', '#/decisions'],
    ['Full plan reference', 'The complete implementation plan, readable and navigable', '#/plan'],
  ]
  for (const [title, snippet, to] of pages) {
    docs.push({ title, kind: 'Page', to, snippet, haystack: `${title} ${snippet}`.toLowerCase() })
  }

  for (const s of STAGES) {
    const body = stageOneLiner(s.n)
    docs.push({
      title: `Stage ${s.n} — ${s.name}`,
      kind: 'Stage',
      to: `#/stage/${s.n}`,
      snippet: body,
      haystack: `stage ${s.n} ${s.name} ${s.short} ${body} ${s.tags.join(' ')}`.toLowerCase(),
    })
    for (const sub of s.subStages ?? []) {
      docs.push({
        title: `Stage ${sub.id} — ${sub.name}`,
        kind: 'Stage',
        to: `#/stage/${sub.id}`,
        snippet: sub.focus,
        haystack: `stage ${sub.id} ${sub.name} ${sub.focus}`.toLowerCase(),
      })
    }
  }

  for (const h of headings) {
    if (h.level < 2 || h.level > 3) continue
    const idx = planRaw.toLowerCase().indexOf(h.text.toLowerCase())
    const snippet = idx >= 0 ? planRaw.slice(idx + h.text.length, idx + h.text.length + 160).replace(/[#`|]/g, '').trim().slice(0, 140) : ''
    docs.push({
      title: h.text,
      kind: 'Plan section',
      to: `#/plan/${h.id}`,
      snippet,
      haystack: `${h.text} ${snippet}`.toLowerCase(),
    })
  }

  for (const [term, def] of GLOSSARY) {
    docs.push({ title: term, kind: 'Glossary', to: '#/plan/glossary', snippet: def, haystack: `${term} ${def}`.toLowerCase() })
  }
  for (const [tool, def, to] of TOOLS) {
    docs.push({ title: tool, kind: 'Term', to, snippet: def, haystack: `${tool} ${def} tool`.toLowerCase() })
  }
  return docs
}

function stageOneLiner(n: number): string {
  const map: Record<number, string> = {
    0: 'Green CI, Postgres test container, synthetic fixture corpus with planted facts.',
    1: 'Every shared type, Protocol, config model, registry, validator, and the testing fakes.',
    2: 'Schema, repositories, row-level security — leakage impossible by construction.',
    3: 'Reliable ingestion engine: queue, incremental sync, deletion reconciliation.',
    4: 'grep, glob, read, ranked keyword search over every collection from day one.',
    5: 'Dense retrieval + RRF fusion behind the one scoped QueryService.',
    6: 'Bounded agent loop with config-generated tools, evidence ledger, citations.',
    7: 'Prose with structure: heading trees, outlines, contextual prefixes, Confluence.',
    8: 'Code first-class: trigram grep, AST chunks, symbol index, redaction, GitLab.',
    9: 'Chat at conversation level: one doc per thread, optional Q&A distillation.',
    10: 'Tickets by meaning and structure, with links captured for the graph.',
    11: 'Lightweight regex-extracted link graph and follow_links traversal.',
    12: 'Rerank, first-move decomposition, routing, bounded trust weighting.',
    13: 'Golden sets, metrics, calibrated judge, ablations, regression gates.',
    14: 'API, UI, upload, webhooks, observability — then onboard app #2 with YAML only.',
    15: 'Extensions only if evals justify: visual docs, entity graph, silo, SCIP, MRs.',
  }
  return map[n] ?? ''
}

export const SEARCH_INDEX: SearchDoc[] = buildIndex()

export function searchDocs(query: string, limit = 12): SearchDoc[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const tokens = q.split(/\s+/).filter(Boolean)
  const scored: Array<{ doc: SearchDoc; score: number }> = []
  for (const doc of SEARCH_INDEX) {
    let score = 0
    let matchedAll = true
    for (const t of tokens) {
      const inTitle = doc.title.toLowerCase().includes(t)
      const inBody = doc.haystack.includes(t)
      if (!inTitle && !inBody) {
        matchedAll = false
        break
      }
      score += inTitle ? 4 : 0
      score += inBody ? 1 : 0
      if (doc.title.toLowerCase().startsWith(t)) score += 2
    }
    if (matchedAll) scored.push({ doc, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.doc)
}
