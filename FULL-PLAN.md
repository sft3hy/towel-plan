# Towel (Super RAG) — Implementation Plan

Oct 12, 2026 · @Sam

## 1. Purpose, scope, and thesis

Towel is a multi-app, agentic RAG platform: an agent with a toolbox of search tools answers questions over collections of documents, and a new app is onboarded by writing configuration, not new retrieval code.

**What "agentic" means here.** Towel does not run a fixed retrieve-then-generate pipeline. It exposes search primitives (grep, glob, lexical search, hybrid search, outline navigation, symbol lookup, link traversal, file reads) as tools. The agent plans, calls tools, inspects results, reformulates, and stops when it has grounded evidence, with a hard budget on steps and tokens.

**Why this shape.** Research collected during design (summarized in section 2) points to four conclusions that drive every stage below:

1. Agentic grep is competitive with vector search, especially for code and exact identifiers, but embeddings still earn their place on prose.
2. The retrieval stack that survives in production is hybrid (lexical + dense, fused by RRF), reranked, with structure-aware chunking.
3. Each source type needs its own segmentation: AST chunks for code, threads for chat, heading trees for docs.
4. Isolation must be enforced in the database, before retrieval, never in the prompt.

### Goals

- One platform, many apps. Hierarchy is Platform > App > Collection > Document > Unit.
- Collections are declared as a profile (a named bundle of connector, parser, segmenter, enricher, indexers) plus settings.
- Every collection is searchable by grep and keyword on day one through a virtual filesystem; embeddings, reranking, and graphs are optional layers on top.
- First app is **ctrl-f**, an engineering knowledge search with collections `gitlab`, `confluence`, `jira`, `chat`, `knowledge_doc`.
- A second app (collections such as `missile_docs`, `adversary_tactics`, `satellite_docs`) proves extensibility. It needs logical separation only, so that agents are not confused by diverse context. It does not need separate infrastructure or keys.
- Every answer cites sources with locators (file and line, heading path, page, thread timestamp) and dates.
- Every stage of the build ships with automated tests that must pass before the next stage starts.

### Non-goals (v1)

- Physical or cryptographic tenant isolation (silo mode). The design leaves a seam for it (Stage 15) but v1 uses pooled storage with mandatory filters.
- Training or fine-tuning models, including RL-trained search agents.
- Full GraphRAG community summarization. A lightweight link graph (Stage 11) covers most multi-hop needs.
- Visual page retrieval (ColPali-style) and entity graphs. Deferred to Stage 15 and built only if evals show a need.
- Writing back to source systems. Towel is read-only against GitLab, Confluence, Jira, and Slack.

### Success criteria

- ctrl-f answers a golden set of real engineering questions with correct citations at or above a threshold set in Stage 13 (initial target: 80% of questions have the correct source in the top 5 results, measured separately from answer quality).
- Onboarding the second app requires zero changes to core packages. Only config, plus at most one new connector.
- No cross-app or cross-ACL leakage in an automated adversarial test suite (Stage 5 and Stage 14).
- p95 search-tool latency under 1.5 s for hybrid search and under 500 ms for grep on the ctrl-f corpus at the target size set in section 8.

## 2. Research findings that drive the design

The evidence supports a layered toolbox, not a single retrieval method: grep and lexical search for exact matches, hybrid search with reranking for prose, structure-aware segmentation per source type, and database-enforced isolation. Figures below come from search results and secondary write-ups gathered in October 2026, not from independently re-run benchmarks. Vendor-reported numbers are marked and should be treated as directional. Stage 13 exists to validate every choice on Towel's own data.

| Topic | What the research says | Decision for Towel | Stage |
| --- | --- | --- | --- |
| Agentic grep/glob | A May 2026 study on LongMemEval (116 questions) found grep generally beat vector retrieval across several agent harnesses, but results depended strongly on harness and tool-calling style. Coding agents rely on grep; Cursor keeps semantic search as a supplement. For prose, vector search is more competitive. | Every collection is exposed as a virtual filesystem so grep/glob work uniformly. Tool results are compact and carry locators. | 4 |
| Hybrid search + rerank | The surviving 2026 production pattern: dense + lexical fused with reciprocal rank fusion (RRF), cross-encoder reranking over the top \~50, structure-aware chunking, and continuous evaluation. Cross-encoders add tens to low hundreds of ms; LLM rerankers can take seconds and zero-shot ones can underperform fine-tuned rerankers out of domain. | BM25 + dense with RRF first; reranker behind an interface (default BGE Reranker v2-m3, managed options such as Voyage rerank-2.5 swappable). | 5, 12 |
| Contextual Retrieval | Anthropic reports top-20 retrieval failures falling from 5.7% to 3.7% with contextual embeddings (35%), to 2.9% adding contextual BM25 (49%), and to 1.9% adding reranking (67%). A critique notes much of the gain comes from standard BM25 and reranking rather than the prefix alone. | Prepend an LLM-written context blurb (or cheap deterministic breadcrumb) to each unit before both dense and lexical indexing. | 7 |
| Tree / outline navigation | PageIndex (vendor-reported) reports 98.7% on FinanceBench using LLM reasoning over a per-document table-of-contents tree. It works within a document and requires hierarchical structure. RAPTOR-style trees help thematic questions but rely on static trees. | Store a heading tree per document and expose get\_outline / read\_section. No tree summarization in v1. | 7 |
| Graph retrieval | GraphRAG-Bench: simple fact retrieval is a near tie (60.9 chunks vs 60.1 graph); graphs lead by about 10 points on complex reasoning and 13 on summarization. Full GraphRAG indexing took 5,500-7,700 s vs 135 s for standard RAG on one comparison; per-query latency was roughly 8x worse. HippoRAG reports up to 20% multi-hop gains at far lower cost than iterative retrieval. | Lightweight link graph built from regex extractors (ticket IDs, MR URLs, repo names). No LLM-built graph in v1. | 11 |
| Late interaction / visual | ColPali-style retrieval indexes page images with multi-vector scoring, skips OCR, but needs a GPU and multi-vector-capable storage. Plain-text corpora are better served by BM25 or text embeddings. | Deferred; profile slot reserved. EmbeddingGemma 2's native image/video/audio embedding (same 768-dim space as text) is the cheaper single-vector alternative to evaluate first in Stage 15A. | 15 |
| Code retrieval | Code search engines fuse three tiers by RRF: trigram lexical (camelCase/snake\_case-aware), symbol definitions/references, and semantic embeddings over AST chunks. The cAST paper found AST chunking beat fixed-size line chunking on RepoEval and SWE-bench. One engine (vendor-reported) cites \~110x faster literal grep at 1K files using a trigram pre-filter. | `code` profile: tree-sitter AST chunks, trigram index, symbol table, dense index, RRF. | 8 |
| Embedding model (self-hosted) | Google's EmbeddingGemma 2 (`google/embeddinggemma-2`, Apache 2.0) encodes text, images, video, and audio into one shared 768-dimensional space. 740M parameters total (270M text backbone, 170M vision encoder, 300M audio encoder), sized to run on consumer hardware. The model card (vendor-reported) cites MTEB multilingual mean 61.36 and MTEB code retrieval NDCG@10 78.68, and defines task instruction prefixes (`SearchQuery:`/`Document:`, code-retrieval variants) plus Matryoshka truncation to 512/256/128 dims. Running it locally showed a 1,024 subword-token input cap for embedding inputs, so segmenters must stay under that. | Chosen as Towel's self-hosted embedder: dense 768-dim for text and code, no embedding egress; task prefixes required; the same model's native image/audio/video embedding is the candidate for Stage 15A media retrieval. Stage 13 confirms truncation levels and re-validates these figures on Towel's own data. | 5 |
| Chat retrieval | Indexing by thread beats chronological buckets of \~200 messages. Snyk used an LLM to extract a question and answer per thread, embedded only the question, and fell back to markdown summaries. Sync pitfalls: missed thread replies and deleted messages lingering in the index. | `thread` profile: one document per thread, markup cleaned, optional Q&A distillation, raw thread kept for grep, deletions reconciled. | 9 |
| First-move decomposition | Decomposing a question into clues, running complementary searches, and reranking a candidate pool before the iterative loop improved deep-research agents. RL-trained search agents (Search-R1 family) also exist but require training. | Optional step 0 in the agent loop; no RL in v1. | 12 |
| Multi-tenancy | Standard patterns: namespace per tenant, index per tenant (silo), or shared index with tenant filter (pool). Rules: filter before retrieval (never in the prompt), mirror source ACLs into metadata at ingestion and enforce at query time, avoid sharing one approximate index across tenants. | Pool isolation with Postgres RLS and per-collection indexes; silo left as a seam. | 2, 5 |
| Document parsing | No single best parser. Docling does local layout and table recovery to Markdown plus JSON; vision-first parsers (Reducto, LlamaParse higher tiers) target dense tables and charts; Mistral OCR and Azure Document Intelligence suit scans. | Parser interface with Docling as default; others pluggable. | 7 |

### Decisions the research did not settle

The embedding model is decided: self-hosted EmbeddingGemma 2 (section 4), one model for text and code with native multimodal embedding reserved for Stage 15A. The following remain explicitly to measurement in Stage 13: reranker choice, chunk sizes per profile, the Matryoshka truncation level for dense vectors (native 768 versus 512/256), whether Q&A distillation of chat is worth its LLM cost, and whether the link graph meaningfully improves multi-hop questions over plain hybrid search.

## 3. System architecture

Towel has five parts: clients, a per-app agent runtime, one scoped query layer, a Postgres store, and a profile-driven ingestion pipeline. The query layer is the only path from agents to data, and it is where app, principal, and ACL scope are enforced.

&#91;embedded content: architecture · 5 layers, 2 apps, 1 scoped query layer\]

Read top to bottom: clients reach an app's agent, the agent reaches data only through QueryService, and ingestion writes into the same store from below.

### Hierarchy

`Platform > App > Collection > Document > Unit`. An **app** is the tenant boundary and owns an agent configuration (prompt, model, trust order, budgets). A **collection** is the retrieval unit: a named set of documents ingested through one profile from one source (for example `gitlab` or `confluence`). A **document** is a normalized source object with an ACL and a virtual path. A **unit** is a retrievable segment with a locator that serves as its citation. Search spans collections only within one app, so the second app's agent never sees ctrl-f's vocabulary or content.

### Pipeline and profiles

Every collection runs the same stages: **Connector, Parser, Segmenter, Enricher, Indexers, Link extractors**. A **profile** is a named bundle of those components plus retrieval settings and the tools it exposes. New data types usually mean a new combination of existing parts.

| Profile | Segmenter | Indexes | Collection-specific tools | Delivered in |
| --- | --- | --- | --- | --- |
| `basic` | fixed window | lexical, dense | none | Stage 6 |
| `structured_doc` | heading tree | lexical, dense, outline | `get_outline`, `read_section` | Stage 7 |
| `code` | AST chunks | lexical (code tokenizer), trigram, symbols, dense | `find_symbol`, `find_references` | Stage 8 |
| `thread` | thread or conversation | lexical, dense | `search_threads`, `read_thread` | Stage 9 |
| `ticket` | overview plus comment groups | lexical, dense, attribute filters | `search_tickets`, `get_ticket` | Stage 10 |
| `visual_doc`, `entity_graph` | page images; entity extraction | late-interaction; graph | `search_pages`; `search_entities` | Stage 15, if needed |

All profiles also get `grep`, `glob`, `read`, `ls`, `search`, and `follow_links` (once Stage 11 lands).

### Virtual filesystem

Every collection is exposed as a read-only tree of normalized text, such as `/confluence/ENG/deploy-runbook.md`, `/chat/infra/2026-09-14-thread-abc.md`, or `/gitlab/payments-service/src/auth.py`. Grep, glob, and read behave identically across all collections, including ones that do not exist yet, which is why any new collection is useful on day one before embeddings or rerankers are configured.

### Query path

1. The API turns credentials into an `AuthContext` (app, principal, groups). The agent cannot choose or alter it.
2. The agent runtime composes a prompt containing only that app's collection manifest, routing hints, and trust order, plus tools generated from the app's config.
3. Optionally a first-move step decomposes the question and runs parallel sub-queries to seed evidence (Stage 12).
4. Each tool call goes to `QueryService`, which resolves permitted collections and runs retrieval through Postgres under row-level security.
5. Hybrid results are fused by RRF, optionally reranked, then lightly weighted by authority and recency.
6. Results are rendered compactly under a token budget, each hit receiving a citation id with its locator, collection, and date.
7. The loop stops on a final answer or a budget, and a validator checks that every citation id maps to evidence actually shown.

### Ingestion path

1. A webhook, schedule, or manual command enqueues a sync job for a collection.
2. The connector lists or diffs changes from a cursor and maps source permissions to ACL principals, failing closed when permissions cannot be resolved.
3. Each changed document is parsed (with secret redaction), segmented, enriched, and written with its units, embeddings, symbols, outline, and links.
4. Deletions are reconciled and purged, and the cursor advances only after the run commits.

### Key decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Retrieval primitives | Agent chooses among grep, glob, lexical, dense, outline, symbols, and links | The research found no single method wins across data types |
| Fusion | Reciprocal rank fusion on ranks, not scores | Lexical and dense scores are not comparable |
| Store | Postgres with pgvector, full-text search, and trigram indexes | One store keeps v1 small; every index sits behind an interface |
| Isolation | Pooled storage, row-level security, per-collection indexes, mandatory filters | Logical separation is enough for the second app, and a silo seam is kept |
| Scope | The platform injects app and principal; tool schemas never contain them | The agent cannot talk its way out of its scope |
| Text for display versus indexing | `text` is untouched for display and grep; `enriched_text` carries context for indexes | Exact search stays exact while semantic search gains context |
| References | Name-based and labeled `resolved=false` | Honest about precision until precise indexers exist |
| Graph | Regex-extracted link edges, no LLM-built graph in v1 | Cost, and evidence that simple facts gain little from graphs |
| Quality | Every feature is flag-gated and measured by Stage 13 evals | Decisions are made on data, not taste |

## 4. Tech stack, repo layout, and conventions

The default stack is Python 3.12 with Postgres as the single store, chosen to keep infrastructure small while every index sits behind an interface so it can be swapped later. These are recommendations from this design effort, not findings from the research; each can be overridden in Stage 0 before code depends on it.

| Concern | Choice | Notes |
| --- | --- | --- |
| Language / tooling | Python 3.12, uv, ruff, mypy (strict), pytest | Typed `Protocol` interfaces for every pluggable stage. |
| Models / validation | Pydantic v2 | All config, schemas, and tool I/O are Pydantic models. |
| API | FastAPI | Thin layer over the same service objects the CLI uses. |
| Database | Postgres 16 with pgvector, pg\_trgm, full-text search | Row-level security for app and ACL isolation. |
| Lexical ranking | Postgres FTS (`ts_rank_cd`) behind a `LexicalIndex` interface | True BM25 is not native to Postgres. If Stage 13 shows a gap, swap in a BM25 extension or OpenSearch without touching callers. |
| Job queue | Postgres-backed queue (for example procrastinate) | Avoids adding Redis in v1. |
| Code parsing | tree-sitter via py-tree-sitter and a language pack | AST chunking and symbol extraction. |
| Document parsing | Docling as default parser behind a `Parser` interface | Vision-first parsers pluggable later. |
| Embeddings | `Embedder` interface; self-hosted **EmbeddingGemma 2** (`google/embeddinggemma-2`) | Decided: dense 768-dim vectors from a self-hosted, Apache-2.0 multimodal model (text and code now; images, video, and audio share the same vector space for Stage 15A). Runs on consumer hardware, so embedding needs no egress. Query and document inputs use the model card's task instruction prefixes; weights must be bfloat16/float32, not float16. Hosted embedders stay implementable behind the same protocol as future swap candidates; dimension truncation is measured in Stage 13. |
| Agent LLM | Claude via the Anthropic API, model configurable per app | Default `claude-sonnet-5-5`. Enrichment (context prefixes, Q&A distillation) uses `claude-haiku-5-5` with prompt caching. |
| CI | GitLab CI | Postgres service container for integration tests. |

### Repo layout

```
towel/
  pyproject.toml
  src/towel/
    core/          # types, config models, registries, errors, AuthContext
    storage/       # db session, migrations, repositories, RLS policies
    pipeline/      # runtime, queue, sync, job states
    connectors/    # gitlab, confluence, jira, slack, upload, localfs
    parsers/       # docling, markdown, html, source_code
    segmenters/    # ast_code, heading_tree, thread, ticket
    enrichers/     # contextual_prefix, qa_distill
    indexes/       # lexical, trigram, symbols, dense, outline, links
    retrieval/     # vfs, fusion, rerank, service
    agent/         # loop, tools, prompts, budget, citations
    api/           # FastAPI app
    cli/           # towel CLI
    evals/         # golden sets, metrics, runner
  profiles/        # code.yaml, structured_doc.yaml, thread.yaml, ticket.yaml
  apps/            # ctrl-f.yaml, app-2.yaml
  tests/           # unit/, integration/, e2e/, adversarial/
  fixtures/        # sample repos, Confluence exports, Slack exports, Jira exports
```

### Engineering conventions (apply to every stage)

- **Interfaces first.** Every pluggable stage (Connector, Parser, Segmenter, Enricher, Indexer, Embedder, Reranker, LLMClient) is a `Protocol` in `towel.core` with a registry. Core never imports a concrete implementation.
- **Deterministic tests.** A `FakeEmbedder` (hash-based, stable vectors) and a `FakeLLM` (scripted responses) ship in Stage 1. No test hits the network. Connectors are tested with recorded fixtures.
- **Idempotent ingestion.** Re-running a sync on unchanged input writes nothing. Content hashes decide.
- **Isolation by construction.** `AuthContext(app_id, principal, groups)` is a required argument of every repository and service method. It is created by the platform, never by the agent.
- **Structured logging and tracing.** Every pipeline job and agent tool call logs `app`, `collection`, `doc_id`, duration, and result counts.
- **Migrations are forward-only** and tested by applying them to an empty database in CI.
- **Every public function has a type signature and a docstring** stating its invariants. Tests reference the invariants they check.

## 5. Data model

Every row that can be retrieved carries `app_id` and `collection_id`, so row-level security and per-collection indexes can be enforced without joins. The model has two retrievable levels (documents and units) plus side indexes for symbols, outline, and links. Each document's full normalized text lives in a separate document\_bodies table (document\_id, app\_id, collection\_id, text), so line-accurate reads and grep never depend on reconstructing text from overlapping units.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `apps` | Tenant boundary | `id`, `name`, `config` (jsonb: prompt, trust order, agent settings) |
| `collections` | Retrieval unit inside an app | `id`, `app_id`, `name`, `profile`, `config` (jsonb), `embedding_model`, `embedding_dim` |
| `documents` | Normalized source object | `id`, `app_id`, `collection_id`, `external_id`, `source_uri`, `vpath`, `title`, `doc_type`, `content_hash`, `modified_at`, `ingested_at`, `authority`, `acl` (text\[\]), `parent_id`, `attributes` (jsonb), `deleted_at` |
| `units` | Retrievable segment | `id`, `document_id`, `app_id`, `collection_id`, `ordinal`, `locator` (jsonb), `text`, `enriched_text`, `token_count`, `content_hash`, `attributes`, `tsv` (tsvector) |
| `unit_embeddings` | Dense vectors | `unit_id`, `collection_id`, `model`, `dim`, `embedding` |
| `symbols` | Code definitions and references | `id`, `collection_id`, `document_id`, `unit_id`, `name`, `qualified_name`, `kind`, `role` (definition or reference), `line_start`, `line_end` |
| `outline_nodes` | Heading tree per document | `id`, `document_id`, `parent_id`, `level`, `heading`, `ordinal`, `first_unit_id`, `last_unit_id` |
| `links` | Cross-document edges | `id`, `app_id`, `src_document_id`, `dst_document_id` (nullable), `dst_ref` (raw text), `kind`, `evidence_unit_id` |
| `sync_state` | Incremental sync cursors | `collection_id`, `cursor`, `last_started`, `last_finished`, `status`, `stats` |
| `jobs` | Pipeline work queue | managed by the queue library |
| `audit_log` | Every tool call | `ts`, `app_id`, `principal`, `tool`, `args_hash`, `result_unit_ids` |
| `eval_*` | Golden questions and run results | created in Stage 13 |

### Rules and invariants

- **Stable IDs.** `documents.id` is a deterministic UUID from `(app_id, collection_id, external_id)`. `units.id` is derived from `(document_id, ordinal, content_hash)`, so unchanged units keep their IDs across syncs.
- **Virtual path (`vpath`).** Each document has a path in the virtual filesystem, unique within a collection. Examples: `/confluence/ENG/deploy-runbook.md`, `/chat/infra/2026-09-14-thread-abc.md`, `/gitlab/payments-service/src/auth.py`, `/jira/PAY-1423.md`. The app is implicit in the `AuthContext`, never part of the path.
- **Soft deletes.** Source deletions set `deleted_at`. A reconciler purges units, embeddings, symbols, links, and outline nodes for deleted documents so stale content cannot be retrieved.
- **ACL semantics.** `acl` is a list of principal identifiers (`user:...`, `group:...`). An empty list means visible to everyone in the app. The query-time predicate is `acl = '{}' OR acl && :principals`. ACLs are mirrored from the source system at ingestion and re-synced on every pass. Permission metadata is treated as dynamic.
- **Authority.** An integer derived from the app's `trust_order` (lower is more trusted) and stored on the document so ranking and agent hints can use it without app logic.
- **One embedding model per collection**, fixed in its config. The platform default is EmbeddingGemma 2 at 768 dims, so v1 collections share one self-hosted model and one vector space (which is also what makes cross-collection media retrieval in Stage 15A possible). The ANN index is a per-collection partial HNSW index with an expression cast to the collection's dimension, so one collection's vectors never affect another's recall.
- **Row-level security.** Policies on `documents`, `units`, `unit_embeddings`, `symbols`, `outline_nodes`, and `links` require `app_id = current_setting('towel.app_id')` plus the ACL predicate. The application sets those session variables from `AuthContext` on every connection checkout. A database role used by the application cannot bypass RLS.

### Locator shapes by profile

A locator is the citation anchor a result must return. Each profile defines one.

| Profile | Locator fields |
| --- | --- |
| `code` | `path`, `start_line`, `end_line`, `symbol`, `commit` |
| `structured_doc` | `heading_path` (list), `page` (optional), `anchor` |
| `thread` | `channel`, `thread_ts`, `message_range` |
| `ticket` | `key`, `section` (`description` or `comment:N`), `updated_at` |

## 6. Configuration spec

Apps and collections are declared in YAML, validated by Pydantic models, and applied with `towel apps apply`; profiles are reusable bundles that collections reference by name. The framework contains no app-specific code, so everything that differs between ctrl-f and the second app lives in these files.

### Profile definition

```yaml
# profiles/code.yaml
profile: code
parser: source_code
segmenter: { name: ast_code, max_tokens: 800, min_tokens: 60 }
enrichers: [path_prefix]
indexes: [lexical, trigram, symbols, dense]
retrieval:
  fusion: rrf
  rrf_k: 60
  rerank: false
  boosts: { definition: 1.5, test_path: 0.6 }
tools: [grep, glob, read, search, find_symbol, find_references]
locator: [path, start_line, end_line, symbol, commit]
```

### App definition: ctrl-f

```yaml
# apps/ctrl-f.yaml
app: ctrl-f
isolation: pool            # silo is reserved, rejected by the validator in v1
agent:
  model: claude-sonnet-5-5
  prompt: prompts/ctrl-f.md
  max_steps: 12
  max_tool_tokens: 40000
  trust_order: [gitlab, knowledge_doc, confluence, jira, chat]
  routing_hints:
    - when: identifier-shaped query (CamelCase, snake_case, path, error string)
      prefer: [grep, find_symbol]
    - when: how-do-I or runbook question
      prefer: [confluence, knowledge_doc]
    - when: why-did-we, decision, or incident history
      prefer: [chat, jira]
link_extractors: [jira_keys, gitlab_mr_urls, repo_names]
collections:
  gitlab:
    description: Source code for all GitLab projects
    profile: code
    source: { connector: gitlab, groups: [platform, payments], sync: webhook }
    embedding: { model: embeddinggemma-2, dim: 768 }
  confluence:
    description: How-to docs, runbooks, and design docs
    profile: structured_doc
    source: { connector: confluence, spaces: [ENG, OPS] }
    enrich: [contextual_prefix]
  jira:
    description: Tickets with comments, status, and links
    profile: ticket
    source: { connector: jira, projects: [PAY, PLAT] }
  chat:
    description: Team chat threads (informal, may be outdated)
    profile: thread
    source: { connector: slack, channels: [infra, payments] }
    enrich: [qa_distill]
  knowledge_doc:
    description: Misc knowledge articles in mixed formats
    profile: structured_doc
    source: { connector: upload }
```

### App definition: second app (illustrative)

Profile assignments below are assumptions about the content and should be confirmed when that app is onboarded.

```yaml
# apps/app-2.yaml
app: app-2
isolation: pool
agent:
  model: claude-sonnet-5-5
  prompt: prompts/app-2.md
  trust_order: [satellite_docs, missile_docs, adversary_tactics]
collections:
  missile_docs:      { description: Technical reference documents, profile: structured_doc, source: { connector: upload } }
  adversary_tactics: { description: Tactics write-ups and taxonomies,  profile: structured_doc, source: { connector: upload } }
  satellite_docs:    { description: Satellite reference documents,     profile: structured_doc, source: { connector: upload } }
```

### Validation rules (enforced at load and at `apply`)

- Unknown profile, connector, parser, segmenter, enricher, or index name is an error that lists the valid names.
- A tool listed by a profile must be backed by an index: `find_symbol` and `find_references` require `symbols`; `get_outline` and `read_section` require `outline`; `search` requires `lexical` or `dense`.
- `dense` in `indexes` requires an `embedding` block (inline, or defaulted at app or platform level; the platform default is `{ model: embeddinggemma-2, dim: 768 }`).
- Collection names are unique within an app, match `[a-z][a-z0-9_]*`, and every collection appears in `trust_order` (or the validator fills a default and warns).
- `isolation: silo` is rejected in v1 with a pointer to Stage 15.
- Changing a collection's profile, segmenter, enrichers, or embedding model marks it for reindex. `towel apps apply --plan` prints what would be rebuilt before anything runs.

### Extension recipes

- **New collection in an existing profile:** add a block to the app YAML. No code.
- **New app:** add a file under `apps/`. No code unless it needs a new connector.
- **New connector:** implement the `Connector` protocol (list, fetch, changes-since-cursor, ACL mapping), register it, add a recorded-fixture test.
- **New profile:** combine existing parser, segmenter, and index components in a profile YAML. If a component is missing, implement the protocol, register it, and add a locator spec.

## 7. How to run this plan

Each stage is a self-contained assignment for one coding agent, and the next stage may start only when the previous stage's gate passes. The stages are numbered 0 to 15 in build order, matching the build order proposed in the architecture discussion.

| Stage | Name | Depends on | Output a human can see |
| --- | --- | --- | --- |
| 0 | Scaffold, tooling, CI, fixtures | none | Green CI on an empty package |
| 1 | Core types, config loader, registries | 0 | `towel apps validate` on the example YAML |
| 2 | Storage layer, migrations, ACL/RLS | 1 | Isolation tests passing against real Postgres |
| 3 | Pipeline runtime, queue, incremental sync | 2 | `towel sync` ingesting a local folder |
| 4 | Virtual filesystem and lexical layer | 3 | `towel grep`, `towel glob`, `towel read` |
| 5 | Embeddings, hybrid retrieval, scoped query service | 4 | `towel search` with fused results |
| 6 | Agent runtime and generated tool surface | 5 | `towel ask` with citations on a toy collection |
| 7 | `structured_doc` profile, upload and Confluence connectors | 6 | Docs searchable with outline navigation |
| 8 | `code` profile and GitLab connector | 6 | Symbol and trigram search over real repos |
| 9 | `thread` profile and Slack connector | 6 | Thread-level chat search |
| 10 | `ticket` profile and Jira connector | 6 | Ticket search with field filters |
| 11 | Link graph | 7, 8, 9, 10 | Cross-source link traversal tool |
| 12 | Reranking, decomposition, routing and trust rules | 11 | Measurable quality uplift on evals |
| 13 | Eval harness and golden sets | 6 (run after 12) | Scorecard report |
| 14 | API, CLI polish, upload UI, second-app onboarding, observability | 12, 13 | Both apps running side by side |
| 15 | Optional extensions | 14 | Only if evals justify |

Stages 7 to 10 are independent of each other once Stage 6 passes, so they can run in parallel with separate agents. Stage 13's harness skeleton can start right after Stage 6 so that every later stage reports metrics.

### Hand-off protocol for each stage

Give the coding agent: sections 1 to 7 of this document, its stage section, and the repository at the previous stage's tag. Instruct it as follows.

1. **Write the acceptance tests first**, using the ones listed in the stage (they are the minimum) plus any others it needs. Confirm they fail, then implement.
2. **Stay inside scope.** Do not modify interfaces or schemas from earlier stages unless the stage says so. If a contract must change, the agent stops, writes a `CONTRACT_CHANGE.md` describing the change and why, updates the contract tests, and flags it for human review.
3. **Run the gate** (`make gate-N`) and fix failures. Do not skip, xfail, or delete tests to pass the gate.
4. **Produce `docs/stages/STAGE_N_REPORT.md`** listing what was built, deviations from the plan, known gaps, and measured numbers (timings, counts) the next stage depends on.
5. **Tag the repo** `stage-N` only after the gate is green on CI.

### Definition of done (every stage)

- All tests marked `stage_0` through `stage_N` pass (full regression, not only the new tests).
- `ruff`, `mypy --strict`, and the migration-from-empty test pass.
- New code has at least 85% line coverage, measured per stage.
- No network access in any test other than the Postgres container.
- Public interfaces have docstrings stating invariants; config examples in section 6 still validate.
- The stage report exists and lists open issues.

### Test policy

- **Markers.** Every test carries a marker `stage_N` for the stage that introduced it. `make gate-N` runs `pytest -m "stage_0 or ... or stage_N"`, so later stages cannot silently break earlier behavior.
- **Tiers.** Unit tests (pure logic, fakes), integration tests (real Postgres via testcontainers, recorded connector fixtures), end-to-end tests (CLI or API against a seeded corpus), adversarial tests (isolation and prompt-injection cases).
- **Fakes.** `FakeEmbedder` and `FakeLLM` from Stage 1 are used everywhere except a small set of tests marked `live`, which are excluded from the gate and run on a schedule.
- **Fixtures.** `fixtures/` holds a small synthetic corpus per source type, created in Stage 0 and extended per stage. Synthetic data only: no real company or customer content in the repository.
- **Property tests.** Segmenters (never lose text, never overlap unexpectedly), fusion (stable ordering, deduplication), and sync (idempotence) get Hypothesis tests.

### Stage card format

Every stage section below uses the same headings: **Goal**, **Depends on**, **Build**, **Out of scope**, **Contracts**, **Deliverables**, **Acceptance tests**, **Gate**, **Pitfalls**.

## Stage 0: Scaffold, tooling, CI, fixtures

**Goal.** A fully wired but empty repository whose CI proves the toolchain, a real Postgres test container, and a synthetic fixture corpus with planted facts that every later stage tests against.

**Depends on.** Nothing.

**Build.**

- A `uv` project with `pyproject.toml`; `ruff`, `mypy --strict`, and `pytest` configured; pre-commit hooks.
- Pytest markers `stage_0` through `stage_15`, `live`, and `adversarial`, registered with `--strict-markers`.
- A `Makefile` with `gate-N` targets that run lint, typecheck, and `pytest -m "stage_0 or ... or stage_N"`. A gate for a stage that does not exist yet exits non-zero with a clear message.
- `docker-compose.yml` for local Postgres 16 using a pinned image that bundles pgvector, and a `pg` pytest fixture using testcontainers that creates the `vector` and `pg_trgm` extensions.
- `.gitlab-ci.yml` with lint, typecheck, and test jobs, using a Postgres service container.
- A `towel` CLI stub (Typer or Click) supporting `--version`, and a logging setup that emits structured JSON.
- The package skeleton from section 4 with empty modules and `py.typed`.
- `fixtures/` with a synthetic corpus (details below) and `fixtures/manifest.json`.

**Fixture corpus.** All content is invented and safe to commit.

- `fixtures/repos/payments-service/` and `fixtures/repos/web-client/`: roughly 25 Python and TypeScript files in total. Include deliberately tricky identifiers (`getUserByID`, `get_user_by_id`, `HTTPServerError`), a long function that must be split, a test file that mentions the same names as source files, and an error string such as `ECONNRESET at pool.acquire()`.
- `fixtures/confluence/`: 8 pages exported as storage-format HTML with nested headings, a table, a code macro, and a status macro; two pages with a stale `last_modified` and conflicting instructions.
- `fixtures/slack/`: a Slack-export-style JSON with 3 channels, 12 threads, replies, edited and deleted messages, emoji, user mentions, and links to fixture Jira keys and merge requests.
- `fixtures/jira/`: 10 issues with descriptions, comments, statuses, labels, and issue links.
- `fixtures/misc/`: a PDF with a table, a DOCX, a Markdown file, and an HTML page.
- `fixtures/planted_facts.yaml`: 30 question and answer pairs, each naming the expected source document and locator (for example: the rollback command for payments-service appears in a specific Confluence section, contradicted by a newer chat thread). Later stages read this file in their end-to-end tests, and Stage 13 uses it as the seed golden set.

**Out of scope.** Any business logic, schema, or interface beyond stubs.

**Contracts.** Marker names, `make gate-N` semantics, fixture directory layout, and the planted-facts file format (`id`, `question`, `expected_docs`, `expected_locator_hint`, `source_types`).

**Deliverables.** The repo; CI configuration; fixtures plus manifest; `docs/stages/STAGE_0_REPORT.md`.

**Acceptance tests (marker `stage_0`).**

1. `towel --version` exits 0 and prints the package version.
2. The `pg` fixture starts Postgres, executes `SELECT 1`, and `CREATE EXTENSION vector` and `pg_trgm` succeed.
3. Running pytest with `--strict-markers` succeeds, and markers `stage_0` to `stage_15` exist.
4. The manifest lists every fixture file with a SHA-256, every listed file exists, and minimum counts hold (25 code files, 8 pages, 12 threads, 10 issues, 4 misc files).
5. Every entry in `planted_facts.yaml` references only files that exist in the manifest.
6. `make gate-0` exits 0 locally and in CI; `make gate-99` exits non-zero with a helpful message.

**Gate.** `make gate-0` green on CI, then tag `stage-0`.

**Pitfalls.** Pin the Postgres and pgvector image version so CI is reproducible. Keep fixtures small so later tests run in seconds. Do not copy real internal content into fixtures, even as examples.

## Stage 1: Core types, config loader, registries

**Goal.** Define every shared type, protocol, and config model, plus the registry and validator, so later stages plug in components without touching core. Nothing in this stage talks to a database.

**Depends on.** Stage 0.

**Build.**

- `towel.core.types`: frozen Pydantic models for `Document`, `Unit`, `Link`, `SearchHit`, `ToolResult`, and a `Locator` discriminated union with one variant per profile (section 5). Include an immutable `AuthContext(app_id, principal, groups)` with a `principals()` method returning the principal plus group identifiers, and an AuthContext.service(app\_id) constructor for ingestion that sets a service flag and carries no principal.
- `towel.core.protocols`: `Connector`, `Parser`, `Segmenter`, `Enricher`, `Indexer`, `Embedder`, `Reranker`, `LLMClient`. Sketch of the shapes:

```python
class Connector(Protocol):
    name: str
    def list_documents(self, cfg: ConnectorConfig, cursor: str | None) -> Iterator[SourceRef]: ...
    def fetch(self, ref: SourceRef) -> RawDocument: ...
    def changes_since(self, cursor: str) -> ChangeSet: ...   # upserts + deletions
    def map_acl(self, raw: RawDocument) -> list[str]: ...

class Segmenter(Protocol):
    def segment(self, doc: ParsedDocument) -> list[UnitDraft]: ...

class Embedder(Protocol):
    dim: int
    def embed(self, texts: Sequence[str], *, kind: Literal["doc", "query"]) -> list[list[float]]: ...
```

- `towel.core.registry`: a registry per component kind with a `register(kind, name, status="available" | "planned")` decorator. Looking up an unknown name raises an error listing valid names. Every component name used in the plan (gitlab, confluence, jira, slack, upload, docling, ast\_code, heading\_tree, thread, ticket, contextual\_prefix, qa\_distill, lexical, trigram, symbols, dense, outline, links) is pre-registered as `planned`. The validator accepts planned names; `apply` refuses them with a message naming the stage that delivers them.
- `towel.core.config`: Pydantic models `ProfileConfig`, `CollectionConfig`, `AgentConfig`, `AppConfig` with `schema_version: 1`, and a loader that reads `profiles/` and `apps/`, resolves each collection against its profile (collection settings override profile defaults), and enforces the validation rules in section 6.
- Ship the section 6 example files as `apps/ctrl-f.yaml`, `apps/app-2.yaml`, and `profiles/*.yaml` (code, structured\_doc, thread, ticket).
- `towel.testing`: `FakeEmbedder` (deterministic hash-based unit vectors, configurable dimension), `FakeLLM` (scripted responses in order, records every call, raises when the script is exhausted), and in-memory fake connector and parser used by later tests.
- Error hierarchy rooted at `TowelError` (`ConfigError`, `RegistryError`, `IsolationError`, `ConnectorError`, `PipelineError`).
- CLI commands: `towel apps validate <path>`, `towel profiles list`, `towel registry list`.

**Out of scope.** Database access, real connectors, real embedding or LLM clients.

**Contracts.** The protocols and models defined here are the contract for all later stages. Changing them later requires the `CONTRACT_CHANGE.md` process from section 7.

**Deliverables.** Core package, example configs, testing fakes, CLI commands, `docs/stages/STAGE_1_REPORT.md` including a generated reference of all config fields.

**Acceptance tests (marker `stage_1`).**

1. Both example app files and all profiles load and validate cleanly.
2. An unknown profile, connector, segmenter, or index name raises `ConfigError` whose message lists the valid names.
3. A profile that lists `find_symbol` without a `symbols` index fails validation; same for `get_outline` without `outline`.
4. `dense` in `indexes` without an embedding block (at collection, app, or platform level) fails validation.
5. A collection missing from `trust_order` gets a default placement and a warning; a duplicate collection name or a name violating `[a-z][a-z0-9_]*` fails.
6. `isolation: silo` is rejected with a message pointing to Stage 15.
7. Registering the same name twice raises `RegistryError`; looking up a `planned` component through `apply` raises an error naming its delivering stage.
8. `FakeEmbedder` is deterministic, returns unit-norm vectors of the requested dimension, and gives different vectors for different texts.
9. `FakeLLM` returns scripted outputs in order, records calls, and raises when the script is exhausted.
10. `AuthContext` is immutable and `principals()` includes the user and all groups.
11. Every `Locator` variant round-trips through JSON; a property test checks config dump and reload equality.
12. `towel apps validate apps/ctrl-f.yaml` exits 0; a deliberately broken file exits non-zero and prints the file path and the offending field.

**Gate.** `make gate-1`, then tag `stage-1`.

**Pitfalls.** Core must never import a concrete implementation. Keep protocols small, because every extra method multiplies later work. Make models frozen so accidental mutation shows up in tests. Version the config schema from day one.

## Stage 2: Storage layer, migrations, ACL and RLS

**Goal.** A Postgres schema, repository layer, and row-level security that make cross-app and cross-ACL leakage impossible by construction, proven by tests against a real database.

**Depends on.** Stage 1.

**Build.**

- Forward-only migrations (Alembic with raw SQL) creating every table in section 5: `apps`, `collections`, `documents`, `units`, `unit_embeddings`, `symbols`, `outline_nodes`, `links`, `sync_state`, `audit_log`, plus document\_bodies (full normalized text per document, under the same RLS policies) and the queue tables added in Stage 3.
- Database roles: an owner role for migrations and an application role with `NOBYPASSRLS` that the service uses. Enable `FORCE ROW LEVEL SECURITY` on every retrievable table so even the owner is subject to policies in application paths.
- RLS policies requiring `app_id = current_setting('towel.app_id')` and the ACL predicate `acl = '{}' OR acl && string_to_array(current_setting('towel.principals'), ',')`. The ACL half is also satisfied when towel.service is on, which only a service context sets; the app\_id half is never bypassed. If the settings are absent, policies must return zero rows (fail closed).
- A session factory `connect(auth: AuthContext)` that opens a transaction and applies `SET LOCAL` for `towel.app_id` and `towel.principals`. Repositories accept only sessions produced this way.
- Repositories: `AppRepo`, `CollectionRepo`, `DocumentRepo`, `UnitRepo`, `EmbeddingRepo`, `SymbolRepo`, `OutlineRepo`, `LinkRepo`, `SyncStateRepo`, `AuditRepo`. Key methods:
  - `DocumentRepo.upsert(doc) -> UpsertResult(changed: bool)` decided by `content_hash`.
  - `UnitRepo.replace_for_document(doc_id, units)` which diffs by unit ID so unchanged units are not rewritten.
  - `DocumentRepo.soft_delete(...)` and a `purge_deleted(collection)` reconciler that removes units, embeddings, symbols, links, and outline nodes.
- Deterministic ID helpers for documents and units (section 5).
- `ensure_collection_indexes(collection)`: creates the per-collection partial GIN index on `tsv`, a partial trigram GIN index on `text`, and a partial HNSW index on the embedding cast to the collection's dimension. It is idempotent, and `drop_collection_indexes` removes them.
- `AppService.apply(config)` which creates or updates app and collection rows and ensures indexes, refusing collections that use `planned` components. Wire it to `towel apps apply [--plan]` and add `towel db migrate`.

**Out of scope.** Ingestion, search queries beyond what tests need, embeddings generation.

**Contracts.** Table and column names from section 5; the `connect(auth)` requirement; ID derivation rules; RLS policy semantics.

**Deliverables.** Migrations, repositories, RLS policies, index manager, CLI wiring, `docs/stages/STAGE_2_REPORT.md` with the final schema and policy listing.

**Acceptance tests (marker `stage_2`).**

1. Migrations apply to an empty database; re-running is a no-op; the resulting tables and columns match a committed schema snapshot.
2. CRUD round trips pass for every repository using two apps and two collections.
3. Document and unit IDs are stable for identical inputs; a unit's ID changes when its content changes and stays the same otherwise.
4. Upserting an identical document reports `changed=False` and performs no row writes (verified by row version or write counters).
5. **Isolation (adversarial):** with data in apps A and B, a context for A sees zero rows of B in every table; the application role with no session settings sees zero rows in every table; the application role cannot disable RLS or alter policies.
6. **ACL:** a document with `acl=['group:sre']` is hidden from principals without that group and visible with it; an empty ACL is visible to every principal in the app; an ACL change on re-upsert takes effect on the next query; a service context sees every ACL-restricted document of its own app and nothing from other apps.
7. `ensure_collection_indexes` creates the three index types for each collection, is idempotent, and dropping the collection removes them. An `EXPLAIN` of a collection-filtered query shows the collection's index being used.
8. After a soft delete and purge, no unit, embedding, symbol, link, or outline row remains for that document, and the document is not returned.
9. The application role cannot `UPDATE` or `DELETE` rows in `audit_log`.
10. A repository call without a valid session raises `IsolationError`.
11. Connection-reuse test: two sequential transactions with different `AuthContext` values on the same pooled connection never see each other's settings.
12. `towel apps apply --plan` prints the planned changes, and `apply` against ctrl-f is refused with messages naming the stages that deliver the missing components.

**Gate.** `make gate-2`, then tag `stage-2`.

**Pitfalls.** `SET LOCAL` only lasts for the transaction, so the session factory must always begin one. Test the pooled-connection case explicitly, since leaked settings are the classic RLS bug. Add composite indexes on `(app_id, collection_id)` so RLS predicates stay cheap. Approximate nearest-neighbor search under a filter can lose recall, so the partial per-collection index matters and the EXPLAIN test guards it.

## Stage 3: Pipeline runtime, job queue, incremental sync

**Goal.** A reliable ingestion engine that moves documents from any connector through parse, segment, enrich, and index stages, with incremental sync, deletion reconciliation, and failure isolation, proven on a local-filesystem connector.

**Depends on.** Stage 2.

**Build.**

- **Runtime.** For each document: `Connector.fetch` then `Parser.parse` then `Segmenter.segment` then each `Enricher` then each `Indexer`, with stages taken from the collection's resolved profile. Stages are called through the Stage 1 protocols only. After parsing, the runtime stores the document's full normalized text in document\_bodies, replacing it whenever the content hash changes.
- **Service context.** Ingestion runs under `AuthContext.service(app_id)`, which bypasses only the ACL half of the RLS predicate and never the app boundary (see the Stage 2 policy note).
- **Queue.** A Postgres-backed queue (`SELECT ... FOR UPDATE SKIP LOCKED` semantics) with job types `sync_collection`, `ingest_document`, `reindex_collection`, `purge_deleted`. Features: idempotency keys, retries with exponential backoff, a dead-letter state, and per-collection mutual exclusion for sync and reindex jobs.
- **Sync algorithm.** Use `changes_since(cursor)` when the connector supports it. Otherwise list everything and apply mark-and-sweep to find deletions. A document whose content hash is unchanged is skipped, except that its ACL is refreshed. The cursor advances only when the run completes. A safety threshold aborts a run that would delete more than a configurable share of a collection (default 30%) unless `--force` is passed.
- **Failure isolation.** A per-document failure is recorded in `ingest_errors` with the document reference and exception, the run finishes with status `partial`, and the next run retries the failed documents.
- **Run records.** An `ingest_runs` table (new migration) storing counts of seen, added, updated, unchanged, deleted, and failed documents plus durations.
- **Built-in components for this stage.** A `localfs` connector (walks a directory, derives ACL from an optional sidecar file), a `markdown` parser (passes Markdown and plain text through), a `fixed_window` segmenter (character windows with overlap, the default until profile-specific segmenters arrive), and a `NoopIndexer`.
- **Helpers for connectors.** A `RateLimiter` and a retry decorator that later connectors reuse.
- **CLI.** `towel sync <app> <collection> [--full] [--force]`, `towel runs list`, `towel worker` (runs the queue consumer).

**Out of scope.** Real source connectors, real indexers (Stage 4 onward), webhooks (the endpoint arrives in Stage 14, but `enqueue_sync` exists now).

**Contracts.** Job types and states; the sync algorithm's cursor and deletion semantics; run and error record shapes.

**Deliverables.** Pipeline package, queue, migrations, built-in components, CLI commands, `docs/stages/STAGE_3_REPORT.md` with throughput numbers on the fixture corpus.

**Acceptance tests (marker `stage_3`).**

1. Syncing a localfs fixture directory creates the expected documents and units; each stored document body equals its source file text; a second sync reports zero changes and performs no writes.
2. Editing one file re-ingests exactly that document, and the IDs of its unchanged units are preserved.
3. Deleting a file results in soft delete and then purge via the reconciler.
4. Safety threshold: removing 60% of files aborts the run with `PipelineError` and deletes nothing; `--force` applies it.
5. ACL-only change (fake connector, same content) updates the stored ACL without touching unit rows.
6. A connector that raises on one document yields run status `partial`, the other documents are ingested, an error row exists, and a later successful run clears it.
7. Queue: failed jobs retry with backoff up to the maximum and then dead-letter; duplicate idempotency keys enqueue once; two concurrent workers never process the same job.
8. The cursor advances only on success; a simulated crash mid-run resumes without losing or duplicating documents.
9. Two sync jobs for the same collection never run concurrently; jobs for different collections can.
10. Property test: for random sequences of add, edit, delete, and ACL-change operations, the database state after incremental syncs equals the state after one full resync from scratch.
11. Writing a document with a different `app_id` than the service context raises `IsolationError`.
12. `towel sync` prints run statistics and `towel runs list` shows them.

**Gate.** `make gate-3`, then tag `stage-3`.

**Pitfalls.** Never advance a cursor before the data it covers is committed. Treat "connector returned nothing" and "everything was deleted" as different cases, since a transient API failure must never wipe a collection (the threshold exists for this reason). Keep stage functions free of database calls so they are easy to unit test.

## Stage 4: Virtual filesystem and universal lexical layer

**Goal.** Make every collection searchable with grep, glob, read, and ranked keyword search, so any new collection is useful on day one with no embeddings. This is the foundation of the agent's exact-match tools.

**Depends on.** Stage 3.

**Build.**

- **Document bodies.** A `document_bodies` table holds each document's full normalized text (created in Stage 2 and filled by the Stage 3 runtime). The VFS reads from it so line numbers and ranges are exact, instead of reconstructing text from overlapping units.
- **`VirtualFS` service** over `documents.vpath` with `ls(path)`, `glob(pattern, scope)`, `stat(path)`, and `read(path, start_line, end_line)`. Paths look like `/{collection}/...`; the app comes from the `AuthContext`. `glob` supports `*`, `**`, `?`, and brace expansion, returns deterministic order, and paginates.
- **`grep`** with literal and regex modes, case-insensitive and whole-word flags, path scoping by glob, collection scoping, configurable context lines, `max_results`, and `offset`. Implementation:
  - A partial trigram GIN index on `document_bodies.text` per collection narrows candidate documents.
  - For regex mode, extract the required literal fragments from the pattern to build the prefilter. Verify and extract exact line matches with a linear-time engine (RE2 bindings) so a user or agent supplied pattern cannot cause catastrophic backtracking.
  - A pattern with no extractable literals (for example `.*`) is allowed only with a path scope or a hard scan cap, and the result carries a warning flag `unindexed_scan`.
- **Lexical search.** A `LexicalIndexer` (registered as `lexical`, status `available`) fills `units.tsv` through a `Tokenizer` hook. The default tokenizer uses the `simple` configuration without stemming plus accent folding. Code collections replace the tokenizer in Stage 8. `lexical_search(query, collections, filters, k)` ranks with `ts_rank_cd`, supports quoted phrases, `-term` negation, and filters `path:`, `collection:`, `after:`, `before:`.
- **Result model and renderer.** All of these return a common `SearchHit` (doc ID, unit ID, collection, vpath, locator, snippet with match highlights, score, modified date, authority, source URI) wrapped in a `ToolResult` carrying `truncated`, `next_offset`, and an estimated token count. A deterministic `render_hits(hits, token_budget)` produces the compact text the agent will see. The research found that harness and result formatting move agent accuracy substantially, so the format is versioned and covered by golden-file tests.
- **CLI.** `towel ls`, `towel glob`, `towel grep`, `towel read`, `towel lexical`, each taking `--app` and `--as <principal>` to build an `AuthContext`.
- Every call writes an `audit_log` row.

**Out of scope.** Embeddings, fusion, reranking, code-aware tokenization, agent integration.

**Contracts.** `SearchHit`, `ToolResult`, path scheme, grep flag semantics, renderer format version `v1`, and the `Tokenizer` hook.

**Deliverables.** VFS service, grep and glob implementations, lexical indexer, renderer, CLI commands, migration for `document_bodies` adding the trigram indexes, `docs/stages/STAGE_4_REPORT.md` with latency measurements on a generated 10,000-document collection.

**Acceptance tests (marker `stage_4`).**

1. After syncing the fixture corpus into a test app, `ls /` lists the collections and nested `ls` calls list directories correctly.
2. `glob` handles `**/*.py`, `src/**/test_*.py`, and `*.{ts,tsx}`; ordering is deterministic; pagination returns every match exactly once; zero matches returns an empty result without error.
3. Literal grep for `ECONNRESET at pool.acquire()` returns the planted file with the correct line number and context lines, verified against `read`.
4. Regex grep `get_?[Uu]ser_?[Bb]y_?[Ii][Dd]` finds both snake case and camel case identifiers; the case-insensitive and whole-word flags behave as documented.
5. A planted match straddling what would be a unit boundary is still found (grep works on document bodies, not units).
6. A catastrophic-backtracking pattern (for example `(a+)+$`) completes within the time limit. A pattern such as `.*` without a scope returns a bounded result with the `unindexed_scan` warning.
7. On a generated 10,000-document collection, `EXPLAIN` for literal grep shows the trigram index in use, and p95 latency is recorded in the stage report (the test asserts a generous bound of 2 s; the report tracks the 500 ms target from section 1).
8. `read` supports line ranges, rejects invalid ranges with a clear error, and enforces a maximum size with `truncated=True` and a `next_start_line`. Reading a path that exists only in another app or behind an ACL returns not-found (never a distinguishable forbidden error).
9. Lexical search puts planted exact-term documents in the top 3, handles phrases, negation, and each filter.
10. **Isolation (adversarial):** every tool returns nothing from another app and nothing ACL-restricted for an unauthorized principal, including via snippets and context lines.
11. Renderer golden-file tests pass, and rendered output never exceeds the token budget and always includes a truncation marker when cut.
12. Each tool call produces exactly one audit row.
13. Registering a custom `Tokenizer` that splits camelCase changes the stored `tsv` accordingly and the new tokens are searchable.

**Gate.** `make gate-4`, then tag `stage-4`.

**Pitfalls.** Regex dialects differ between Postgres and application engines, so never use a database regex as the final matcher; use it, if at all, only for prefiltering. Return not-found for anything the caller cannot see to avoid leaking existence. Keep context-line extraction ACL-safe by reading from the already-authorized document body only.

## Stage 5: Embeddings, hybrid retrieval, and the scoped query service

**Goal.** Add dense retrieval, fuse it with lexical search by reciprocal rank fusion, and put every retrieval primitive behind one `QueryService` that enforces app, collection, and ACL scope. After this stage a collection supports the proven hybrid baseline.

**Depends on.** Stage 4.

**Build.**

- **Embedder adapters.** Implement the chosen local adapter for **EmbeddingGemma 2** (`google/embeddinggemma-2`, Apache 2.0) behind the Stage 1 `Embedder` protocol, selected by collection config, plus at least one hosted adapter kept behind the same protocol as a future swap candidate. The local adapter runs self-hosted (for example Ollama or sentence-transformers on CPU or consumer GPU): dense 768-dim output, bfloat16/float32 weights (float16 is unsupported), and inputs truncated to the model's embedding token cap (observed locally as 1,024 subword tokens, so segmenters and the adapter must enforce it explicitly). Apply the model card's task instruction prefixes: `SearchQuery` for queries and `Document` for documents, and the `CodeRetrieval` variants for `code` collections. Support batching, retry with backoff, and rate limiting. Validate the adapter's dimension against the collection's `embedding_dim` at apply and ingest time.
- **Embedding cache.** An `embedding_cache` table keyed by `(model, content_hash)` that stores vectors only, never text, and is not reachable from user-facing queries. Unchanged units are never re-embedded.
- **`DenseIndexer`** (registered `dense`, status `available`): embeds each unit's `enriched_text` (falling back to `text`) and writes `unit_embeddings`.
- **`dense_search(query, collections, filters, k)`** using the per-collection HNSW index with the collection filter applied inside the query.
- **Fusion.** `rrf_fuse(rankings, k=60, weights=None)` that works on ranks, not raw scores (lexical and dense scores are not comparable). Deterministic tie-breaking, deduplication by unit, and an option to collapse to a maximum number of units per document.
- **`HybridSearch`.** For each target collection, run lexical and dense retrieval concurrently (default 50 candidates each), fuse per collection, then fuse across collections so a large collection cannot dominate. Each hit carries provenance (which retrievers returned it and at what rank). Neutral weights for now; authority weighting arrives in Stage 12.
- **Metadata filters** (equality, ranges, date bounds, `attributes` keys) applied inside both retrievers, before ranking.
- **`QueryService`.** The single entry point to `grep`, `glob`, `read`, `ls`, `lexical_search`, `dense_search`, and `hybrid_search`. It requires an `AuthContext`, resolves the set of collections permitted for that app, and rejects unknown collections with an error that lists only collections of the caller's own app. A `NoopReranker` is wired in behind the `Reranker` protocol.
- **Reindexing.** The `reindex_collection` job handles an embedding model or dimension change by rebuilding vectors and the collection's HNSW index.
- **Isolation test harness** `towel.testing.isolation`: a reusable adversarial suite that runs any retrieval function under multiple app and principal contexts against a seeded two-app, ACL-mixed dataset and asserts no leakage. Every later stage that adds a retrieval tool must register it with this harness.
- **CLI.** `towel search "<query>" --collections a,b --mode hybrid|lexical|dense [--explain]`, where `--explain` prints per-retriever ranks.

**Out of scope.** Reranking models, query decomposition, authority or recency weighting, and agent integration.

**Contracts.** `QueryService` method signatures; hit provenance fields; the rank-based RRF contract; `embedding_cache` semantics; the isolation harness API.

**Deliverables.** Embedder adapters, cache, dense indexer, fusion, hybrid service, query service, isolation harness, CLI additions, `docs/stages/STAGE_5_REPORT.md` with recall measurements on `fixtures/retrieval_cases.yaml` and latency numbers.

**Acceptance tests (marker `stage_5`).**

1. Re-syncing an unchanged corpus makes zero embedding calls (counted through the fake); editing one unit embeds only that unit.
2. An embedder whose dimension differs from the collection's `embedding_dim` fails with a clear error before any write.
3. RRF unit tests: known inputs give the expected fused order; ties are deterministic; weights are respected; duplicates merge. Property test: the fused list is the union of inputs with no duplicates and non-increasing scores.
4. Using a deterministic bag-of-words test embedder, cases in `fixtures/retrieval_cases.yaml` pass: queries with planted synonyms are found by dense but missed by lexical; exact-identifier queries are found by lexical; hybrid finds both kinds.
5. A metadata or date filter changes results correctly and is applied before ranking (a case where the unfiltered top hit must disappear).
6. A multi-collection query returns hits from several collections with correct provenance, and collection scoping restricts results.
7. `EXPLAIN` shows the collection's HNSW index used for a filtered dense query.
8. **Isolation (adversarial harness):** hybrid, dense, and lexical search never return another app's units or ACL-restricted units, and `embedding_cache` is unreadable by the application role through user-facing paths.
9. Changing a collection's embedding model triggers `reindex_collection`, old vectors are removed, and search works at the new dimension.
10. `towel search --explain` prints retriever ranks for each hit.
11. `QueryService` rejects an unknown collection name and the error lists only collections in the caller's app.
12. On a generated 10,000-document collection, p95 hybrid latency is recorded (the test asserts a generous bound; the report tracks the 1.5 s target).

**Gate.** `make gate-5`, then tag `stage-5`.

**Pitfalls.** Always embed queries in `query` mode. Do not normalize and sum raw scores across retrievers. Cap per-retriever candidates to keep latency predictable. Approximate search under filters can silently lose recall, so keep per-collection indexes and monitor recall in Stage 13.

## Stage 6: Agent runtime and generated tool surface

**Goal.** A bounded agent loop that answers questions with citations using tools generated from each app's configuration, with scope injected by the platform so the agent can never reach outside its app or caller permissions. This is the first stage where "ask a question, get a cited answer" works end to end, on a toy collection.

**Depends on.** Stage 5.

**Build.**

- **Tool framework.** A `Tool` protocol with a name, description, Pydantic-derived JSON schema, and `run(auth, args) -> ToolResult`. The `AuthContext` is injected by the runtime and never appears in a schema.
- **Tool generator.** Builds the tool list for an app from its config and collections. Core tools in this stage: `list_collections`, `search` (hybrid, with a `mode` option), `grep`, `glob`, `ls`, `read`. Later stages register capability-gated tool factories (`find_symbol`, `find_references`, `get_outline`, `read_section`, `search_threads`, `read_thread`, `search_tickets`, `follow_links`) through a registry keyed by the index each requires. The `collections` argument in every schema is an enum of that app's collection names only, which both prevents invalid calls and keeps the agent from seeing other apps' vocabulary.
- **LLM adapter.** An Anthropic Messages API adapter for the `LLMClient` protocol with tool use, prompt caching on the static prefix, and retry handling. `FakeLLM` (Stage 1) is used in tests.
- **System prompt composer.** Static instructions first (for cache hits), then the app prompt, then a collection manifest (name, description, capabilities, document count, date range), routing hints, and the trust order. The prompt states that retrieved content is data, not instructions.
- **Agent loop.** Plan, call tools (parallel calls allowed), read results, and stop when the model gives a final answer. Budgets: `max_steps`, `max_tool_tokens`, and a wall-clock timeout. When a budget is hit, force a final answer that states what is missing. Identical repeated tool calls return a note pointing to the earlier result. Over-budget older tool results are compacted to short stubs.
- **Evidence ledger and citations.** Every hit shown to the model gets a short id (`[1]`, `[2]`). The final answer must cite ids. A validator maps ids to `{vpath, locator, source_uri, modified_at, collection}`, strips unknown ids, and flags an answer with no valid citations as `ungrounded`.
- **Injection hygiene.** Tool results are wrapped in clearly delimited data blocks with delimiter characters escaped inside content. Tool call arguments are validated strictly; unknown tools, unknown collections, and any attempt to set app or principal fields are rejected with an error result.
- **Tracing.** An `agent_runs` table (new migration) storing question, steps, tool calls, evidence ids, token usage, latency, and stop reason.
- **Streaming events.** The loop yields typed events (`tool_call`, `tool_result`, `text_delta`, `final`) for later UIs.
- **`basic` profile** (localfs-compatible parsing, `fixed_window` segmenter, `lexical` and `dense` indexes, core tools) and a test app `apps/_test.yaml` using it over the fixture corpus.
- **CLI.** `towel ask "<question>" --app <app> [--as <principal>] [--trace]`.

**Out of scope.** Profile-specific tools, reranking, query decomposition, trust rules beyond the prompt text, API server, UI.

**Contracts.** The `Tool` protocol, tool-factory registry, `ToolResult` envelope, citation format, `agent_runs` shape, and event types.

**Deliverables.** Tool framework and generator, agent loop, Anthropic adapter, prompt composer, ledger and validator, tracing, CLI command, `docs/stages/STAGE_6_REPORT.md` including a sample trace and results of the `live` tests.

**Acceptance tests (marker `stage_6`).**

1. Generated tool schemas for an app list only that app's collections, and a property check across all tools confirms no schema contains `app_id`, `principal`, or `groups`.
2. Capability gating: an app with only the `basic` profile has no `find_symbol` tool; a test profile that declares a `symbols` index plus a stub factory makes it appear.
3. A `FakeLLM` script of search, then read, then final produces an answer whose citations match the ledger and stop reason `final`.
4. Budgets: a script that never stops calling tools ends at `max_steps` with a forced finalization; exceeding `max_tool_tokens` compacts old results; the stop reason records which budget triggered.
5. Tool errors (bad arguments, unknown tool, unknown collection, invalid regex) are returned as error results and never raise out of the loop.
6. Citation validation strips unknown ids, and an answer with no valid citation is flagged `ungrounded`.
7. **Injection hygiene:** a fixture document containing instruction-like text and fake tool-call syntax appears only inside an escaped data block; a scripted adversarial model attempting another app's collection or an `app_id` argument is rejected and audited.
8. **Isolation:** the same scripted run under app A and app B yields disjoint evidence; ACL-restricted documents never appear in the ledger for unauthorized principals.
9. Every run writes an `agent_runs` row, and `towel ask --trace` prints steps and token counts.
10. Streaming events arrive in the correct order for a multi-step run.
11. A snapshot test of the composed system prompt shows only the caller's app collections, routing hints, and trust order; no other app's names appear anywhere.
12. `live` tests (excluded from the gate): with the real model on the fixture corpus, at least 5 planted facts are answered with correct citations; results recorded in the report.

**Gate.** `make gate-6`, then tag `stage-6`.

**Pitfalls.** Oversized tool results are the main way agents degrade, so render compactly and make pagination easy. Tool descriptions drive routing quality; write them like documentation, with when-to-use guidance. Keep static prompt content at the front so prompt caching works. Never let the model choose the result count without a hard cap.

## Stage 7: structured\_doc profile, upload and Confluence connectors

**Goal.** Ingest prose documents with their structure intact, so the agent can search them, navigate their outlines, and read exact sections. Delivers the `structured_doc` profile used by ctrl-f's `confluence` and `knowledge_doc` collections and by the second app's document collections.

**Depends on.** Stage 6. Can run in parallel with Stages 8, 9, and 10.

**Build.**

- **Parsers.** A `docling` adapter handling PDF, DOCX, PPTX, HTML, and Markdown, emitting Markdown plus a structured model (headings, tables, page numbers). A `confluence_html` parser for Confluence storage format that converts: code macros to fenced blocks with language, status macros to inline text, info/warning/note panels to labeled blockquotes, expand macros to sections, tables to Markdown tables, user mentions to display names, and internal links to resolved page titles. Unknown macros keep their inner text and increment an `unknown_macro` counter in run stats.
- **Segmenter `heading_tree`.** Builds the heading tree, then emits units per section split at paragraph boundaries (defaults: max 500 tokens, min 80 tokens, with tiny siblings merged). A table or code block is never split mid-row or mid-line unless it alone exceeds the maximum, in which case it is split by rows with the header repeated and the unit flagged. Each unit's locator carries `heading_path`, `page` when known, and an `anchor`.
- **Outline index and tools.** An `OutlineIndexer` (registered `outline`) writes `outline_nodes` with first and last unit ids. Tool factories `get_outline(path)` (tree with token counts) and `read_section(path, heading_path)` register with the Stage 6 generator and appear only for collections whose profile includes `outline`.
- **Enricher `contextual_prefix`.** Two modes. `deterministic` prepends a breadcrumb (source, space or folder, parent titles, page title, heading path, last-modified date). `llm` asks a small model for one or two sentences situating the unit in its document, using prompt caching of the document and a cache keyed by `(document hash, unit hash, prompt version)`. The prefix goes into `enriched_text`, which both the lexical and dense indexers use, while `text` stays untouched for display and grep.
- **Connector `upload`.** Accepts files via `towel ingest <app> <collection> <paths>` (the HTTP endpoint comes in Stage 14), stores originals in a `BlobStore` abstraction (local directory implementation now, S3-compatible later), dedupes by content hash, replaces on re-upload of the same filename, enforces a size limit, and records unsupported types as ingest errors.
- **Connector `confluence`.** Uses the Confluence REST API with pagination, 429 backoff, and incremental sync by last-modified date. Deletions come from mark-and-sweep because the API cannot list them. Preserves the page tree (`parent_id`), labels and version in `attributes`, and optionally ingests attachments as child documents. **ACL mapping fails closed:** page restrictions and space permissions map to principals, and if they cannot be resolved the document gets a restrictive placeholder ACL and a warning rather than being public.
- **Profile `structured_doc`** (indexes `lexical`, `dense`, `outline`; tools `grep`, `glob`, `read`, `search`, `get_outline`, `read_section`), now `available`.
- **CLI.** `towel ingest`, `towel outline <path>`, and `towel apps apply --collections a,b` to apply a subset of an app's collections.

**Out of scope.** Chat, code, and ticket profiles; link graph; reranking; visual page retrieval for scanned or chart-heavy PDFs (Stage 15).

**Contracts.** The Markdown conversion rules (golden-file tested), `heading_tree` unit boundaries, the `outline_nodes` semantics, `enriched_text` versus `text`, and the fail-closed ACL rule.

**Deliverables.** Parsers, segmenter, outline indexer and tools, enricher, upload and Confluence connectors, profile, CLI additions, recorded Confluence fixtures plus a small fake Confluence server for tests, `docs/stages/STAGE_7_REPORT.md` with retrieval results on the Confluence and misc fixtures.

**Acceptance tests (marker `stage_7`).**

1. Each of the 8 Confluence fixture pages converts to its golden Markdown; no raw macro markup remains; code, panels, tables, mentions, and links are handled as specified.
2. The PDF fixture with a table yields a Markdown table and page numbers in locators; the DOCX fixture keeps its heading hierarchy. If Docling is too heavy for default CI, a recorded-output double is used and one real test is marked `slow`.
3. Segmenter properties (Hypothesis on random Markdown): all body text is covered, no unit exceeds the maximum except flagged unsplittable blocks, tables and code blocks are never split mid-row or mid-line, and `heading_path` is correct.
4. `get_outline` matches the document's headings; `read_section` returns exactly the section text; an unknown heading returns an error listing the closest valid headings.
5. Deterministic prefix: `enriched_text` begins with the breadcrumb, a query for a term present only in the breadcrumb finds the unit, and `text` is unchanged. LLM mode (with `FakeLLM`) calls once per unit, hits the cache on re-run, and a prompt-version bump invalidates it.
6. Hybrid search finds the planted Confluence facts in the top 3, including one whose answer is inside a table cell.
7. Upload connector: PDF, DOCX, Markdown, and HTML fixtures ingest; re-uploading a filename replaces the document; identical content dedupes; an unsupported type is recorded as an error; an oversize file is rejected.
8. Confluence connector against the fake server: pagination, 429 backoff, incremental sync, deletion via sweep, parent links, labels as attributes, restrictions mapped to ACLs, and an unresolvable restriction fails closed with a warning.
9. **Isolation:** a restricted page is invisible to an unauthorized principal through search, grep, `get_outline`, and `read_section` (all registered with the isolation harness).
10. Staleness: units carry `modified_at`, rendered hits show relative age, and the two conflicting fixture pages both appear with their dates.
11. `towel apps apply --collections confluence,knowledge_doc` applies ctrl-f's document collections cleanly while the other collections remain refused as planned.
12. End-to-end `towel ask` with a scripted `FakeLLM` over the Confluence fixtures returns an answer citing the correct section.

**Gate.** `make gate-7`, then tag `stage-7`.

**Pitfalls.** Macro behavior varies by Confluence version and installed plugins, so degrade gracefully and count what was skipped. Resolve include macros only if needed and guard against cycles. Trashed and archived pages should be treated as deletions. Space-level permissions are the usual source of ACL bugs, so keep the fail-closed behavior and test it.

## Stage 8: code profile and GitLab connector

**Goal.** Make code first-class: exact search through trigram grep, identifier-aware keyword search, symbol lookup, and semantic search over AST-aligned chunks, fused by RRF. Delivers the `code` profile for ctrl-f's `gitlab` collection.

**Depends on.** Stage 6. Can run in parallel with Stages 7, 9, and 10.

**Build.**

- **Connector `gitlab`.** Lists projects by configured groups; fetches the tree and raw files for the default branch (other branches are out of scope in v1, and the system prompt tells the agent it is searching the default branch). The per-project cursor is the last indexed commit SHA. Incremental sync uses the compare API to find added, modified, deleted, and renamed files. If the stored SHA is not an ancestor of the new head (force push), fall back to a full resync of that project. Pagination and 429 backoff via the Stage 3 helpers.
- **Ignore rules.** Skip binaries, vendored and build directories (`node_modules`, `vendor`, `dist`, `build`, `.git`), lockfiles, files over a size limit (default 1 MB), and generated files (header markers such as "DO NOT EDIT" or a generated attribute). Support a per-repo `.towelignore`.
- **ACL mapping.** Project visibility and membership (including inherited group members) map to principals. Private projects are restricted to their members. If membership cannot be fetched, fail closed with a warning. Permission changes are picked up on the next sync, even when no file changed.
- **Parser `source_code`.** Language detection by extension and shebang, parsing with tree-sitter. For unsupported languages, fall back to blank-line-bounded windows.
- **Secret redaction.** A `RedactingParser` decorator wraps any parser and replaces detected secrets (API keys, tokens, private key blocks, credentials in URLs) with a placeholder before the document body is stored, so secrets never reach grep, lexical, dense, or enrichment. Redacted documents get an `attributes.redactions` count. Stage 9 reuses it for chat.
- **Segmenter `ast_code`.** Split-then-merge over the AST in the style of the cAST approach: units are declarations (functions, classes, methods); an oversize node splits recursively into its children; small neighbors (imports, constants) merge up to the budget (defaults: max 800 tokens, min 60). Units are line-aligned with exact `start_line` and `end_line`, and each carries a header of repo, path, enclosing class or namespace, and signature.
- **Enricher `path_prefix`.** Prepends `repo | path | symbol | language` to `enriched_text` for lexical and dense indexing.
- **Tokenizer `code_tokenizer`.** Splits camelCase, snake\_case, kebab-case, and dotted paths into parts and also keeps the whole identifier, so `user id`, `userId`, and `user_id` all reach `getUserByID`.
- **Symbol index.** A `SymbolIndexer` (registered `symbols`) fills `symbols` using per-language tree-sitter queries for definitions (functions, classes, methods, interfaces, types, constants) and name-based references from identifier nodes (not comments or strings). Tools: `find_symbol(name, kind?, repo?, exact?)` ranking exact match over qualified-suffix over fuzzy, and `find_references(symbol)` grouped by file. Reference results are explicitly labeled `resolved=false` because v1 matches by name, not by type-aware resolution (precise cross-references through SCIP are a Stage 15 option).
- **Ranking hooks.** The `retrieval.boosts` block of the profile is applied after fusion: definitions above references, and test-path files demoted.
- **Embeddings for code.** Config allows `dense.include` and `dense.exclude` globs so generated, test, or fixture directories can skip embedding to control cost.
- **Profile `code`** (indexes `lexical`, `trigram`, `symbols`, `dense`) now `available`.

**Out of scope.** Merge requests, issues, and discussions (see section 9); non-default branches; type-aware references; code execution of any kind.

**Contracts.** The `ast_code` unit shape and locator, symbol table semantics including the `resolved` flag, `.towelignore` format, the redaction placeholder format.

**Deliverables.** Connector, parser, redaction decorator, segmenter, enricher, tokenizer, symbol indexer and tools, boosts, profile, a fake GitLab server and fixtures (extended with planted fake secrets), `docs/stages/STAGE_8_REPORT.md` with throughput and retrieval numbers.

**Acceptance tests (marker `stage_8`).**

1. Against the fake GitLab server serving the fixture repos: group listing, tree and raw fetch, pagination, and 429 backoff work; the initial sync ingests exactly the expected files; ignore rules and `.towelignore` are honored.
2. Incremental sync: a push with modified, added, deleted, and renamed files updates exactly those documents; the cursor advances only on success; a force push triggers a project resync.
3. ACL: private-project members map to principals, inherited group members are included, an unavailable membership API fails closed, and a permission change is picked up without any file change.
4. For Python, TypeScript, and one more fixture language: units align to AST nodes; the long fixture function splits at statement boundaries into at least two units, each with its signature header; adjacent imports merge; reading the locator's line range from the file equals the unit text. Property test: units cover all non-whitespace lines without overlap. The unsupported-language fallback works.
5. `find_symbol("getUserByID")` and `find_symbol("get_user_by_id")` return the right definitions with correct file and line; qualified `Class.method` works; the `kind` filter works; a miss lists the closest names.
6. `find_references` excludes the definition, groups by file, labels results `resolved=false`, and ignores matches in comments and strings.
7. Code tokenizer: queries `user id`, `userId`, and `user_id` all retrieve units containing `getUserByID`; after boosts the definition outranks test files mentioning the same names.
8. Retrieval cases from `planted_facts.yaml` for code: conceptual questions land the expected file in the top 3 (test embedder); the planted error string is found by grep with the correct path and line.
9. **Redaction:** planted fake credentials are absent from `document_bodies`, units, and embeddings input, appear as the placeholder, and grep for the fake secret returns nothing.
10. **Isolation:** private-repo code is invisible to unauthorized principals through grep, glob, read, `find_symbol`, `find_references`, and search (all registered with the harness).
11. Throughput is recorded for the fixture repos and for a generated 5,000-file repository; a 10-file incremental push stays under a documented time bound.
12. End-to-end `towel ask` (scripted `FakeLLM`) returns a citation whose path and line range are correct.

**Gate.** `make gate-8`, then tag `stage-8`.

**Pitfalls.** Pin tree-sitter grammar versions, because grammar changes alter chunk boundaries. Heuristic references produce false positives, which is why they are labeled. Generated code and vendored files add noise and cost, so keep ignore rules strict. Code routinely contains committed secrets, so redaction must run before anything is stored or embedded.

## Stage 9: thread profile and Slack connector

**Goal.** Make chat searchable at the conversation level, with optional distillation of threads into question and answer units, while keeping chat clearly marked as informal and possibly stale. Delivers the `thread` profile for ctrl-f's `chat` collection.

**Depends on.** Stage 6. Can run in parallel with Stages 7, 8, and 10. The ACL and redaction behavior reuses patterns from Stages 7 and 8.

**Build.**

- **Connector `slack`** with two modes selected by config: `api` (Slack Web API: channel list, history, replies) and `export` (a Slack export directory or zip, used for bulk backfill and for the fixtures). Channels come from an explicit allowlist. **Direct messages and group DMs are never ingested**, and config validation rejects any attempt to include them.
- **Incremental sync (api mode).** Track the newest timestamp per channel and re-fetch a lookback window (default 7 days) so late replies to old threads, edits, and deletions are caught. A thread whose `latest_reply` is newer than the stored value is re-fetched and re-rendered. Deletions inside the window are reconciled by mark-and-sweep.
- **Rendering.** Each document is a Markdown transcript with a header (channel, date range, participants, permalink) and lines like `[14:03] @name: text`. Resolve user and channel mentions to names, strip emoji codes and join/leave system messages, preserve code blocks and links (Jira keys and merge request URLs especially), show edited messages with their latest text, and record reaction counts in `attributes`.
- **Document boundaries.** One document per thread (parent plus replies). Unthreaded top-level messages are grouped into conversation documents using a time-gap rule (default: a new group after 10 minutes of silence, at most 20 messages). The vpath is `/chat/<channel>/<yyyy-mm-dd>-<slug-or-ts>.md`.
- **ACL mapping.** Public channels map to the app-wide default or a configured group; private channels map to their member principals. If membership cannot be fetched, fail closed with a warning.
- **Redaction.** Reuse the `RedactingParser` from Stage 8 so pasted tokens and credentials never reach any index.
- **Segmenter `thread`.** A thread at or under the maximum (default 700 tokens) is one unit. Longer threads split by message groups with a one-message overlap and a repeated header. The locator carries `channel`, `thread_ts`, and `message_range`.
- **Enricher `qa_distill` (optional).** A small model classifies each thread and, for question-and-answer threads, extracts `question`, `answer`, `status` (resolved, unresolved, uncertain), and referenced tickets or repositories into `attributes.qa`. It adds a derived `qa` unit: the dense index embeds only the question text, while the lexical index covers question and answer. Threads that are not Q&A get a short summary unit instead. Derived units carry `attributes.derived=true`, and citations always resolve to the raw thread locator. Cost controls: a minimum message count, `max_threads_per_run`, a cache keyed by thread content hash plus prompt version, and a skipped-count report.
- **Tools.** `search_threads(query, channel?, after?, before?, author?)` and `read_thread(path | thread_id, offset?)` register as capability-gated factories.
- **Profile `thread`** (indexes `lexical`, `dense`; tools `grep`, `glob`, `read`, `search`, `search_threads`, `read_thread`) now `available`.

**Out of scope.** File and attachment contents, DMs, real-time event ingestion (the webhook path is in Stage 14), PII classification beyond secret redaction.

**Contracts.** The transcript format, thread and conversation document rules, derived-unit semantics, and the DM exclusion rule.

**Deliverables.** Connector (both modes), renderer, segmenter, enricher, tools, profile, a fake Slack server, `docs/stages/STAGE_9_REPORT.md` with retrieval results and distillation cost per 1,000 threads on the fixtures.

**Acceptance tests (marker `stage_9`).**

1. Export-mode ingestion of the fixture export yields the expected thread and conversation documents; the fixture DM file is never ingested; a config that lists a DM or group DM channel fails validation.
2. Golden-file transcripts verify mention resolution, emoji stripping, system-message removal, code blocks, preserved Jira keys and merge request URLs, and edited messages showing their latest text.
3. Segmenter: a short thread is one unit; a long synthetic thread yields multiple units with overlap and repeated header; `message_range` is correct; property test: every message appears in at least one unit.
4. Fake Slack server (api mode): cursor pagination, 429 with `Retry-After`, incremental sync with lookback; a late reply to an old thread triggers re-ingestion of that thread; a deleted reply re-renders the thread without it; a deleted parent removes the document.
5. ACL: private-channel threads are visible only to members, public channels follow config, unresolved membership fails closed, and a membership change is picked up on the next sync.
6. **Redaction:** a planted fake token is absent from bodies, units, and embedding inputs, replaced by the placeholder.
7. `qa_distill` with `FakeLLM`: a Q&A thread yields a derived unit; the dense embedding input for it contains only the question (checked through the fake embedder's call log); a non-Q&A thread gets a summary unit; reruns hit the cache; a prompt-version bump invalidates it; `max_threads_per_run` stops the run and the skipped count is reported.
8. A citation to a derived unit resolves to the raw thread locator, and the renderer labels derived text as model-extracted.
9. Retrieval cases: planted chat facts are found in the top 3, including a fact that appears only in a late reply of a long thread, and the planted error string is found by grep in a transcript.
10. `search_threads` filters (channel, date range, author) work and `read_thread` paginates.
11. **Isolation:** chat tools are registered with the harness; private-channel content never leaks, and an adversarial test confirms DM content cannot be retrieved even if a DM file is added to the export.
12. Conflict and staleness: a chat thread newer than the Confluence fixture page and contradicting it is returned alongside it with both dates intact.

**Gate.** `make gate-9`, then tag `stage-9`.

**Pitfalls.** Verify the current Slack API rate limits and terms for your app type before relying on api mode, since they have changed over time; export-based backfill is the fallback. Ingesting chat has privacy implications, so keep the channel allowlist explicit, document retention expectations, and consider an optional `max_age_days` purge. Distilled answers can be wrong, which is why they are labeled and always trace back to the raw thread.

## Stage 10: ticket profile and Jira connector

**Goal.** Make tickets searchable both by meaning and by structure (status, type, assignee, labels, dates), and capture their links to merge requests and docs for the link graph. Delivers the `ticket` profile for ctrl-f's `jira` collection.

**Depends on.** Stage 6. Can run in parallel with Stages 7, 8, and 9.

**Build.**

- **Connector `jira`.** Project allowlist; incremental sync with a JQL `updated` filter and an overlap margin so late updates are not missed; paginated issues and comments; changelog summarized into key status transitions. Captured fields: key, summary, description, type, status and status category, resolution, priority, assignee, reporter, labels, components, fix versions, sprint, epic or parent, created, updated, resolved, issue links, remote links (merge requests, Confluence pages), and attachment names only. A `field_map` setting maps instance-specific custom fields. Abstract Cloud versus Data Center differences (API version, pagination style) inside the connector.
- **Deletions and moves.** Deleted issues cannot be listed, so a periodic key-only listing per project feeds mark-and-sweep with the Stage 3 safety threshold. A moved issue (key change) becomes delete plus add, with `attributes.previous_keys` recorded.
- **ACL mapping.** Project browse permissions and issue security levels map to principals. Issues under a security level are restricted to that level's members, and anything unresolvable fails closed with a warning.
- **Parser `jira_markup`.** Converts Atlassian Document Format JSON and legacy wiki markup to Markdown, covering code blocks, mentions, links, panels, tables, and lists.
- **Document layout.** One document per issue: a header (key, title, status, type, priority, assignee, dates), the description, comments in chronological order with author and timestamp, then a links section. The vpath is `/jira/<PROJECT>/<KEY>-<slug>.md`.
- **Segmenter `ticket`.** An overview unit (header, summary, description; split if long) plus comment units that group consecutive comments up to the token maximum. Locators are `{key, section}` where section is `description` or `comment:N-M`. Every unit's `enriched_text` starts with `KEY | status | type | summary`.
- **Structured attributes and filters.** Typed `attributes` for all fields above plus a computed `is_open`. A helper `ensure_attribute_indexes(collection, fields)` creates a partial GIN index and expression indexes for the commonly filtered fields.
- **Tools.** `search_tickets(query?, status?, type?, assignee?, labels?, project?, open_only?, created_after?, updated_after?)`: with a query it runs hybrid search under those filters, and with no query it returns a structured listing sorted by last update, paginated. If the query contains a ticket key, that ticket is returned first. `get_ticket(key)` returns the full ticket with a summary of linked issues and gives the closest keys on a miss.
- **Profile `ticket`** (indexes `lexical`, `dense`; tools `grep`, `glob`, `read`, `search`, `search_tickets`, `get_ticket`) now `available`.

**Out of scope.** Writing to Jira, attachment contents, sprint analytics, the link graph itself (Stage 11 consumes `remote_links` and `issuelinks`).

**Contracts.** The issue document layout, unit locator format, the `attributes` field list, and tool signatures.

**Deliverables.** Connector, parser, segmenter, attribute index helper, tools, profile, a fake Jira server and fixtures, `docs/stages/STAGE_10_REPORT.md`.

**Acceptance tests (marker `stage_10`).**

1. Fake Jira server with the 10 fixture issues: pagination, 429 backoff, comment pagination, and changelog handled; the initial sync ingests everything; golden Markdown matches for issues written in ADF and in wiki markup, including code blocks, mentions, and tables.
2. Incremental sync: an updated issue is re-ingested, unchanged issues are skipped, a new comment on an old issue is picked up, a moved issue replaces the old key and records `previous_keys`, a deleted issue is removed by sweep, and the safety threshold triggers on mass disappearance.
3. ACL: a security-level issue is restricted, project permissions map correctly, unresolvable permissions fail closed with a warning, and a permission change is picked up.
4. Segmenter: overview plus comment grouping; a 40-comment issue yields several comment units with correct `comment:N-M` ranges; every comment appears in at least one unit; headers repeat; property test on random comment lists.
5. Attribute filters work singly and combined (status, type, labels, assignee, project, date ranges, `open_only`), and on a generated set of at least 10,000 issues `EXPLAIN` shows the attribute indexes in use.
6. `search_tickets` with no query lists results sorted by update time and paginates; with a query it ranks by hybrid score; a query containing `PAY-1423` returns that ticket first; `get_ticket` returns linked-issue summaries; an unknown key lists the closest keys.
7. Retrieval cases: planted Jira facts land in the top 3, including one that exists only in a comment.
8. Remote links to merge requests and Confluence pages are stored in `attributes.remote_links` and issue links in `attributes.issue_links` (consumed by Stage 11 tests).
9. **Isolation:** ticket tools are registered with the harness; security-level issues never leak through search, structured listings, counts, or error messages.
10. Resolved and closed tickets render with resolution and date, and `open_only` excludes them.
11. End-to-end `towel ask` (scripted `FakeLLM`) about a ticket cites the correct key and section.
12. `towel apps apply --collections jira` succeeds for ctrl-f.

**Gate.** `make gate-10`, then tag `stage-10`.

**Pitfalls.** Custom fields differ per instance, so keep them in `field_map` and never hard-code IDs. ADF is verbose and has many node types, so degrade unknown nodes to their text and count them. Large changelogs can dominate API time, so summarize only status transitions. Issue security levels are the most common source of leaks, so test them directly.

## Stage 11: Link graph

**Goal.** Connect documents across collections (a chat thread to a ticket, a ticket to a merge request, a runbook to a repository) with a lightweight edge table and a traversal tool, giving the agent most of the multi-hop benefit of graph retrieval without LLM-built graphs. The research showed full GraphRAG is costly and pays off mainly on complex reasoning and summarization, so this stage is deliberately cheap and measurable.

**Depends on.** Stages 7, 8, 9, and 10 (it consumes all four profiles' documents and attributes).

**Build.**

- **Extractor registry** with `extract(doc, units) -> list[LinkDraft(kind, dst_ref, confidence, evidence_unit_id)]`. Built-ins:
  - `jira_keys`: matches `[A-Z][A-Z0-9]+-\d+` only for project keys configured for the app, plus `/browse/KEY-N` URLs, so lookalikes such as `UTF-8`, `SHA-256`, or `CVE-2024-1234` never match.
  - `gitlab_mr_urls`: canonicalizes merge request, issue, commit, and file URLs (trailing paths and query strings normalized) to stable `dst_ref` values. File URLs resolve to ingested code documents by path on the default branch; merge requests and commits stay unresolved references until a future stage ingests them, but they still tell the agent which repository to look in.
  - `confluence_urls`: resolves page URLs by page ID or title form to documents.
  - `repo_names`: matches known repository names with configurable minimum length, stop-list, and case-sensitive matching, at confidence 0.7 because name matching is heuristic.
  - `file_paths`: path-like mentions that resolve to ingested code vpaths.
  - `structured`: edges taken from connector attributes (Jira `issue_links` and `remote_links`, Confluence parent and child pages).
- **Edge kinds:** `mentions`, `links_to`, `parent`, `blocks`, `relates`, `duplicates`, `references_file`, `implements`.
- **`LinkIndexer`** (registered `links`) writes `links` rows with `dst_document_id` when the target exists, otherwise a dangling row keeping `dst_ref`. A `resolve_pending_links(app)` step after each sync resolves dangling rows when targets arrive and re-dangles them when targets are deleted. A document update replaces only that document's outbound edges (diff-based), and deleting a document removes its edges.
- **Visibility rules.** An edge is visible only if its source document is visible and, for resolved edges, its destination document is visible to the same principal. No title, count, or snippet of a restricted neighbor may ever be returned. Cross-app edges are impossible by constraint.
- **Tool `follow_links(path_or_key, direction=out|in|both, kinds?, depth<=2, limit)`** returns neighbors grouped by collection with kind, evidence snippet, and dates, in deterministic order with fan-out caps (high-degree hubs such as a widely mentioned README are demoted and capped).
- **Link expansion (off by default).** `QueryService.expand_with_links(hits, max_extra)` adds linked documents of top hits as secondary candidates at reduced score. It is enabled per app or profile through `retrieval.link_expansion` and is wired only after Stage 13 shows it helps.
- **CLI.** `towel links <path> [--in|--out]` and `towel links stats`.

**Out of scope.** LLM entity or relation extraction, community detection, graph summaries, ingestion of merge requests themselves.

**Contracts.** The `links` row semantics (resolved versus dangling, confidence), edge kinds, visibility rules, and the `follow_links` signature.

**Deliverables.** Extractors, indexer, resolver, tool, expansion hook, CLI, `docs/stages/STAGE_11_REPORT.md` with per-extractor precision on the fixtures.

**Acceptance tests (marker `stage_11`).**

1. `jira_keys` finds the fixture ticket keys in chat, Confluence, and code comments, and ignores lookalikes (`UTF-8`, `ISO-8601`, `SHA-256`, `CVE-2024-1234`); keys of unconfigured projects are ignored.
2. `gitlab_mr_urls` canonicalizes variants of the same merge request URL to one `dst_ref`; file URLs resolve to the right ingested documents; commit URLs remain unresolved.
3. `confluence_urls` resolves both ID-based and title-based URL forms.
4. `repo_names` precision: with the stop-list and minimum length, a fixture repository named like a common word produces no spurious edges, and surviving edges carry confidence 0.7.
5. Structured extractors turn Jira issue links and remote links, and Confluence parent and child pages, into edges of the correct kinds.
6. A dangling link resolves after its target is ingested and `resolve_pending_links` runs; deleting the target makes it dangling again; deleting the source removes its edges.
7. Re-syncing unchanged content writes no link changes; editing a document to remove a mention removes that edge.
8. `follow_links` handles out, in, and both directions, kind filters, depth 2 with caps, grouping, and deterministic order; an unknown path returns an error with suggestions; hub fan-out is capped.
9. **Isolation:** a restricted document never appears as a neighbor, in a count, or in an evidence snippet for an unauthorized principal; `follow_links` is registered with the harness; inserting a cross-app edge fails.
10. Multi-hop cases: for the planted chain chat thread to Jira ticket to Confluence runbook, link expansion places the chain in the top 5 where plain hybrid search does not for at least one fixture case; both outcomes are recorded.
11. A neighbor query of depth 2 on a generated graph of 100,000 edges has p95 under 300 ms (recorded; generous assert).
12. `towel links` prints edges for a document and aggregate stats.

**Gate.** `make gate-11`, then tag `stage-11`.

**Pitfalls.** Name-based extractors create false positives, so keep confidence values and let ranking and the agent see them. Hub documents can flood expansion, so enforce degree-based demotion and caps. Treat edges as hints, never ground truth, until evals confirm their value.

## Stage 12: Reranking, first-move decomposition, routing, and trust rules

**Goal.** Raise answer quality with the techniques the research found most consistently useful: cross-encoder reranking over fused candidates, a first-move step that decomposes the question and seeds the agent with reranked evidence, deterministic routing for obvious query shapes, and mild authority and recency weighting. Every feature is an independent flag so Stage 13 can measure each one.

**Depends on.** Stage 11.

**Build.**

- **Reranker adapters** behind the `Reranker` protocol: a local cross-encoder (default BGE Reranker v2-m3), a managed rerank API adapter, and an optional LLM listwise reranker using a small model. Config per app or collection: `retrieval.rerank: {model, top_n_in: 50, top_n_out: 10, timeout_ms, fallback}`. A timeout or error falls back to the fused order, records `rerank_status=fallback`, and never fails the search. Short-lived cache keyed by `(query, unit hash)`. Input text is `enriched_text` truncated to a configured length.
- **Placement.** Reranking runs after global fusion inside `HybridSearch`, and also for the query forms of `search_threads` and `search_tickets`.
- **Authority and recency weighting.** After reranking: `final = rerank_score x authority_weight x recency_factor`. Authority weights derive from the app's `trust_order` or explicit `authority_weights`. Recency uses a per-profile half-life (chat decays quickly, Confluence slowly, code not at all). Both adjustments are bounded (default plus or minus 15%) so relevance dominates, and `--explain` shows every component.
- **Deterministic router** (`towel.agent.router`): identifier-shaped queries schedule `grep` and `find_symbol`; ticket keys schedule `get_ticket`; quoted strings or stack-trace-like text schedule `grep`; plain how-to questions schedule `search` over document collections first. App `routing_hints` are rendered into the system prompt as before and also feed these rules.
- **First-move decomposition** (`agent.first_move: decompose | none`). A cheap model call returns a validated JSON plan: `intent`, `entities` (identifiers, ticket keys, error strings, paths), up to four `subqueries` each with collection and tool hints, and `time_sensitivity`. The orchestrator runs the sub-queries in parallel through the same tools, dedupes and reranks the pool, and injects the top evidence as a clearly labeled pre-retrieved block whose items are registered in the evidence ledger. The loop then continues for follow-ups. Trivial queries (a single identifier or very short text) skip it. Sub-queries count against the step and token budgets. Invalid JSON gets one retry and then falls back to no decomposition.
- **Conflict hints.** For top hits from different collections whose embedding similarity is above a threshold and whose `modified_at` dates differ by more than a configured gap (default 90 days), tool output attaches `possible_conflict_with` ids. The prompt instructs the agent to prefer higher-trust and newer sources, state both when they disagree, and recommend verification. These are hints, not conclusions.
- **Egress policy.** An additive config block `egress: {allowed_providers: [...]}` per app, validated at apply, so an app can forbid sending its content to external embedding or rerank providers. This keeps the option open for apps with stricter data-handling needs without needing silo isolation.
- **Feature flags.** Each of `rerank`, `authority`, `recency`, `first_move`, `conflict_hints`, and `link_expansion` is independently switchable per app, and `--explain` reflects the active set.
- **CLI.** `towel search --rerank/--no-rerank --explain` and `towel ask --first-move`.

**Out of scope.** Training or fine-tuning any model, RL-trained search policies, new retrieval indexes.

**Contracts.** The score composition formula and bounds, the first-move JSON schema, the router rule table format, the feature flag names, and the egress config block.

**Deliverables.** Reranker adapters, weighting, router, first-move step, conflict hints, egress validation, flags, `docs/stages/STAGE_12_REPORT.md` with latency overhead and a per-flag top-3 hit-rate table.

**Acceptance tests (marker `stage_12`).**

1. Reranker contract tests with a deterministic `FakeReranker`: order changes as designed; a timeout or exception falls back to the fused order with `rerank_status=fallback` and never raises; repeat calls hit the cache; batch size limits are respected.
2. A `slow` smoke test with the real local cross-encoder reranks 50 candidates under a recorded latency (excluded from the gate).
3. Placement: reranking happens after global fusion on at most `top_n_in` candidates and returns `top_n_out`; a planted case where fusion ranks the right unit around 15th and the reranker lifts it into the top 3 passes.
4. Authority weighting: at equal relevance a higher-trust collection ranks first; a property test shows the adjustment never exceeds the bound; the flag off means no change.
5. Recency: an old chat thread is down-weighted against a new one by the configured half-life, code and Confluence are unaffected under their config, and `--explain` shows each factor.
6. Router: a table-driven test of at least 30 queries confirms the right tools are scheduled for identifiers, ticket keys, quoted strings, stack-trace text, and how-to questions.
7. First-move with `FakeLLM`: the plan validates against its schema; invalid JSON retries once then falls back; sub-queries run concurrently (verified with instrumented fake tools); the pool is deduped and reranked; pre-retrieved evidence enters the ledger and its citations validate; trivial queries skip the step; budgets are respected.
8. Conflict hints: the planted stale-Confluence versus newer-chat contradiction yields `possible_conflict_with`; unrelated pairs do not; the prompt contains the conflict-handling instruction.
9. Flags toggle independently, unknown flags fail validation, and defaults are documented.
10. Egress: an app whose `allowed_providers` excludes a configured external reranker or embedder fails `apply` with a clear message.
11. **Isolation:** the candidates passed to the reranker and the content placed in decomposition prompts contain only authorized units (verified with instrumented fakes under the harness).
12. Timeouts are enforced for each step, and the report records the added latency of rerank and first-move with real adapters.
13. Regression guard: on `retrieval_cases.yaml` plus the planted facts, each flag combination is reported, and any flag that lowers top-3 hit rate by more than 2 points against the Stage 11 baseline is defaulted off.

**Gate.** `make gate-12`, then tag `stage-12`.

**Pitfalls.** Cross-encoders truncate long inputs, which can hurt code units, so cap and test lengths. LLM decomposition can add one to three seconds, which is why trivial queries skip it and why it is measured. A third-party reranker receives candidate text, so the egress policy must be checked before enabling one for any app.

## Stage 13: Eval harness and golden sets

**Goal.** Make retrieval and answer quality measurable and regression-gated, so every open decision (embedding model, reranker, chunk sizes, chat distillation, link expansion) is settled by data. A skeleton runner can start right after Stage 6 so earlier stages report numbers; this stage completes it.

**Depends on.** Stage 6 for the skeleton, Stage 12 for the full ablation matrix.

**Build.**

- **Golden set format** in `evals/<app>/golden.yaml`: `id`, `question`, `type` (lookup, how-to, why, troubleshoot, multi-hop, negative), `expected` (acceptable sources with graded relevance 0 to 2 and optional locator hints), `answer_points` (facts a correct answer must contain), `must_not` (for example superseded instructions), `as_principal` (for ACL cases), `exclude_docs` (for leave-one-out), `expect_abstain` (for negatives), `tags`, `version`. `fixtures/planted_facts.yaml` seeds the CI set.
- **Retrieval metrics (no LLM):** recall@1, 3, 5, 10, MRR, nDCG@10 with graded relevance, broken down by question type, collection, and tag, plus latency percentiles. The runner supports ablations of every Stage 12 flag and individual retrievers: lexical only, dense only, hybrid, plus rerank, plus authority, plus recency, plus link expansion.
- **Answer metrics (agent runs):** citation recall (expected sources cited), citation precision and groundedness (judged), correctness against `answer_points` (judged), abstention correctness on negatives, stale-source usage rate (answer relies on a source superseded by a newer conflicting one), and steps, tool calls, tokens, cost, and latency per question.
- **Judge.** A `Judge` protocol with a `FakeJudge` for tests. The real judge uses a different model from the agent when possible, with versioned prompts. A `towel evals calibrate` command compares judge verdicts to `evals/<app>/human_labels.yaml` and reports agreement; low agreement is flagged in every report.
- **Runner.** `towel evals run --app <app> --set <name> --config <flags.yaml> --out runs/<id>` persists to new `eval_runs` and `eval_results` tables and emits JSON and Markdown scorecards. A deterministic mode uses the fakes for CI, and a live mode uses real models on a schedule. Config matrices support parameter sweeps (chunk size, RRF k, candidate counts, embedding model, reranker).
- **Comparison and gating.** `towel evals compare A B` reports per-metric deltas with bootstrap confidence intervals. `towel evals gate --baseline <run> --max-regression <x>` exits non-zero on a regression beyond the threshold.
- **Leave-one-out.** Questions can exclude their own source documents so mined questions are not trivially answerable.
- **Mining real questions.** `towel evals mine-chat` takes resolved Q&A threads from `qa_distill` (those linked to a ticket or document) and writes candidates with question, accepted answer, source thread, and linked documents to `evals/<app>/candidates.yaml`. A review command records accept or reject, and accepted items merge into the golden set with a version bump. Candidates carry dates because chat answers can be stale.
- **ANN health.** `towel evals ann-recall` compares approximate search with brute-force results per collection and flags recall below a threshold, guarding against filtered-ANN loss.
- **Failure analysis.** Reports list the worst questions with their traces for debugging.
- **Dataset hygiene.** Golden sets are versioned, with a held-out test split (default 30%) reserved for final decisions.

**Out of scope.** Automatic prompt optimization, production feedback UI (Stage 14 stores thumbs data that later feeds candidates).

**Contracts.** The golden-set schema, metric definitions, run and result tables, scorecard format, and gate semantics.

**Deliverables.** Harness, metrics, judge plumbing, mining and review commands, ANN check, CI targets, baseline scorecard `evals/baselines/stage13.json`, `docs/stages/STAGE_13_REPORT.md` containing the first sweep results and the data-backed choices for the open decisions listed in section 2.

**Acceptance tests (marker `stage_13`).**

1. Golden-file schema validation rejects malformed files with clear errors; the seed set built from planted facts validates; graded relevance is supported.
2. Metric unit tests on synthetic rankings match hand-computed recall, MRR, and nDCG; property tests confirm values stay within 0 and 1 and that recall@k never decreases as k grows.
3. The runner is deterministic under the fakes (two runs give identical results), persists results, and writes JSON and Markdown scorecards with per-type and per-collection breakdowns.
4. The ablation matrix runs all configured variants and the table shows each, with the fixture cases designed so the expected ordering of variants holds.
5. Compare and gate: a known synthetic improvement is detected as significant, a no-change run is not flagged, and `gate` exits non-zero past the regression threshold and zero otherwise.
6. Leave-one-out: a question with `exclude_docs` never retrieves the excluded document and its metrics are computed without it.
7. `FakeJudge` flows through answer metrics; calibration against the human-label fixture reports agreement and flags a deliberately noisy judge; the judge prompt version is recorded.
8. Negative questions: a scripted agent that answers anyway is scored wrong and one that abstains is scored right.
9. **ACL evals:** a question run as an unauthorized principal fails the eval, as a hard failure, if any restricted source appears in results or citations.
10. `mine-chat` on the fixture distilled threads produces candidates with source thread and linked documents and records exclusions; the review command accepts and rejects; accepted items merge with a version bump.
11. `ann-recall` computes recall against brute force on a generated collection and flags a deliberately degraded index.
12. Every run records tokens, calls, and p50 and p95 latency, and scorecards show them.
13. `make eval-smoke` runs the deterministic subset in under two minutes, and the scheduled live job in `.gitlab-ci.yml` passes a lint check.
14. The Stage 13 baseline scorecard exists and is referenced by the later regression gate.

**Gate.** `make gate-13`, then tag `stage-13`.

**Pitfalls.** LLM judges are noisy and biased, so calibrate them and report confidence intervals. Small question sets give wide intervals, so do not over-read single deltas. Golden sets mined from chat can contain outdated answers, so require human review. Keep real golden sets, which contain internal content, out of the public repository and out of any prompt used to build the system.

## Stage 14: API, upload UI, second-app onboarding, observability

Stage 14 turns the engine into a product and proves the platform thesis. It is large, so it is split into four sub-stages (14A to 14D) executed in order, each with its own gate (`make gate-14a` and so on). Add the markers `stage_14a` to `stage_14d` to the Stage 0 marker list; each gate includes every earlier marker.

**Depends on.** Stages 12 and 13.

### Stage 14A: HTTP API, authentication, and identity mapping

**Goal.** A secure API in front of the engine in which the app and caller identity come only from credentials, never from request content.

**Build.**

- FastAPI endpoints: `POST /v1/apps/{app}/ask` (server-sent events with the Stage 6 event types, plus a final JSON with citations and run id), `POST /v1/apps/{app}/search`, `GET /v1/apps/{app}/collections`, `GET /v1/apps/{app}/documents/{path}`, `POST /v1/apps/{app}/collections/{c}/documents` (multipart upload, only for collections whose connector is `upload`), `DELETE` of a document, `GET` upload job status, `GET /v1/apps/{app}/runs/{id}` (trace), `POST /v1/apps/{app}/feedback`.
- Authentication by OIDC JWT or app-scoped API keys. A token carries or maps to an app and principal. The `{app}` in the URL must match the token's app or the request gets 403. Admin operations use a separate scope.
- An `IdentityResolver` protocol with a default table-driven implementation that maps one user identity (for example an email) to the per-source principals used in ACLs (GitLab, Jira, Slack, Confluence identifiers) and maps IdP group claims to group principals. **Unmapped users fail closed:** they see only app-wide documents.
- Per-principal rate limits, request size limits, and configurable CORS. A committed OpenAPI spec with a contract test.

**Acceptance tests (marker `stage_14a`).**

1. A valid token yields the correct `AuthContext`; a URL app that differs from the token's app returns 403; invalid or expired tokens return 401; admin scope is separate from user scope.
2. Identity mapping: an unmapped user sees only app-wide documents; a mapped user sees documents restricted to their source principals; group claims map; a mapping change takes effect on the next request.
3. `ask` streams events in the correct order and ends with citations and a run id; a client disconnect cancels the run and stops further tool calls; budget stops are returned as structured errors.
4. `search` matches `QueryService` results; document reads return not-found for restricted documents; collection listing shows only the caller's app.
5. Upload: multipart accepted for `upload` collections only, type and size validated, a job id returned, status shows progress, delete removes and purges, re-upload is idempotent.
6. Rate limiting returns 429 with headers; oversized bodies are rejected.
7. **Adversarial API suite:** path traversal in document paths, injection strings in filters, attempts to switch app through headers, body, or query, insecure direct object reference on run traces (another principal's trace must be inaccessible), and CORS misconfiguration cases all fail safely.
8. The OpenAPI snapshot test passes.

**Gate.** `make gate-14a`, tag `stage-14a`.

### Stage 14B: Webhooks, admin operations, observability, and hardening

**Goal.** Keep indexes fresh, make the system operable, and close basic security gaps.

**Build.**

- Webhook endpoints for GitLab (secret token), Slack (signing secret with timestamp), and Confluence and Jira (shared-secret HMAC), with replay protection and a debounce that coalesces bursts into a single `enqueue_sync` with scope hints (project path, channel).
- Admin endpoints for `apps apply --plan` and `apply`, reindex, dead-letter inspection and retry, and audit-log queries.
- Observability: structured logs; OpenTelemetry traces across API, agent steps, each tool, and DB calls (attributes carry app and collection, never content); Prometheus metrics for ask latency, tool latency, tokens, cost, errors, queue depth, sync lag per collection, ingest errors, rerank fallbacks, and budget stops; Grafana dashboards and alert rules for sync lag, error rate, and dead letters; cost reporting per app.
- `/healthz` and `/readyz` (readiness fails when the database is unreachable or migrations are pending).
- Spend caps per app per day and per-principal limits.
- Hardening: dependency scanning in CI, an SSRF guard on connector base URLs (blocking link-local and metadata addresses, with a host allowlist), and an upload content-type check with a virus-scan hook.

**Acceptance tests (marker `stage_14b`).**

1. Each webhook rejects a bad signature or stale timestamp with 401 and a replayed request is refused; a valid request enqueues a scoped sync; a burst of 50 events within the debounce window produces one sync.
2. Admin endpoints enforce admin scope; plan output matches the CLI; dead letters can be retried; audit queries filter correctly.
3. The metrics endpoint exposes every defined metric, and the sync-lag gauge updates under a fake clock; per-app cost accounting is correct for a scripted run.
4. One `ask` produces a single trace with spans for the API, each agent step, each tool, and database calls (checked with an in-memory exporter). A planted fake secret and document text appear in no log line or span.
5. Readiness fails with the database down or migrations pending and passes otherwise.
6. Spend caps stop a run with a clear error; per-principal limits apply.
7. Dashboard and alert files pass their linters or schema checks.
8. A connector configured with a link-local or metadata address is refused; the CI pipeline contains the dependency scan job.

**Gate.** `make gate-14b`, tag `stage-14b`.

### Stage 14C: Web UI with drag-and-drop upload

**Goal.** The user-facing experience from the original brief: drag documents in, watch them ingest, ask questions, and see cited answers.

**Build.** A thin single-page app (React, Vite, TypeScript) that talks only to the API: login via OIDC; an app switcher showing only apps the user belongs to; a collection list with document counts and freshness; a multi-file and folder drag-and-drop uploader with per-file progress, retry, and clear errors, including the supported-types list; a document browser with delete; an ask panel with streaming answers and a stop button; a citations panel with locators, an expandable excerpt, copy, and open-source links; display of conflict hints and the model-extracted label on derived units; feedback buttons; an admin-only trace viewer; empty, loading, and error states; keyboard navigation and accessible labeling.

**Acceptance tests (marker `stage_14c`).**

1. Component tests (Vitest) cover the uploader states, citation rendering, and the conflict and derived-unit labels.
2. Playwright end-to-end against a docker-compose stack with a fake LLM: drag-and-drop a fixture file, watch status reach complete, find it by search, ask a question, and receive a cited answer whose citation opens the right excerpt.
3. Folder upload and multi-file upload work, a failed file can be retried, and an unsupported type shows a clear message.
4. A second user without access to a restricted document never sees it in listings, answers, or citations; switching apps changes visible collections and clears the conversation.
5. The stop button cancels a streaming answer.
6. Automated accessibility checks (axe) report no critical violations on the main views.
7. The production build is reproducible, stays within a documented bundle size budget, and contains no secrets.

**Gate.** `make gate-14c`, tag `stage-14c`.

### Stage 14D: Second-app onboarding and extensibility proof

**Goal.** Demonstrate that a new app is configuration, and that apps never confuse each other.

**Build.**

- Onboard `app-2` from the section 6 example using only YAML and fixtures. Fixture documents are synthetic placeholders with invented, non-sensitive content, one set per collection (`missile_docs`, `adversary_tactics`, `satellite_docs`). Confirm profile assignments with the app's owners before real data is loaded.
- Run both apps from one docker-compose stack (API, worker, Postgres) with `make e2e`.
- Operator documentation in `docs/operators.md` with runbooks for adding an app, a collection, a connector, and a profile, plus backup and restore (Postgres dump and blob store) and an upgrade procedure.
- A load test (Locust or k6) with a fake LLM that records throughput and latency at 20 concurrent asks across both apps.

**Acceptance tests (marker `stage_14d`).**

1. **Zero core changes:** the onboarding change set touches nothing under `src/towel/core`, `storage`, `pipeline`, `retrieval`, or `agent` (verified by a CI diff check), and `towel apps apply` for `app-2` succeeds.
2. Separation: a query in either app never returns the other app's documents, even for an exact phrase present only in the other app; the system prompt and manifest of each app contain only its own collection names (snapshot tests); tool schemas list only its own collections.
3. A randomized interleaving stress test of 1,000 concurrent requests across both apps and several principals on a shared connection pool shows zero cross-app or cross-ACL leakage.
4. The runbook recipes are executed by tests: a toy collection with a tiny new connector is added using only the registry and YAML, and a new profile is composed from existing components.
5. Backup and restore: restoring a dump into an empty database yields identical search results for a fixed query set; the upgrade test applies migrations from the previous tag.
6. The load test meets the documented targets (recorded in the report) and the report states the observed capacity limits.
7. `make e2e` passes: both apps ingest their fixtures, answer a planted question each with correct citations, and the UI smoke test passes for both.

**Gate.** `make gate-14d`, tag `stage-14` (the combined release candidate).

**Pitfalls (whole stage).** Never derive the app from anything the client controls. Identity mapping across source systems is the hard part of ACLs, so test unmapped and partially mapped users thoroughly. Keep the UI thin so every capability stays testable through the API. Webhooks are untrusted input until verified.

## Stage 15: Optional extensions

Each extension starts only when Stage 13 evals (or a business requirement) show a need, and each runs as its own mini-stage (`stage_15a` and so on) under the same hand-off protocol, with its own acceptance tests and gate. The table gives the trigger, scope, and the tests that define done.

| Ext. | Start only if | Scope | Key acceptance tests |
| --- | --- | --- | --- |
| 15A `visual_doc` profile | Evals show failures on scanned, chart-heavy, or slide-style documents that text parsing cannot fix | Two candidates, evaluated in that order: (a) EmbeddingGemma 2 multimodal mode — the already-chosen embedder natively encodes page images (and video and audio) into the same 768-dim space as text, so media become ordinary `unit_embeddings` rows searchable by the existing dense path with no new index technology, no OCR, and no extra model to serve; (b) if (a) underperforms on charts or dense pages, a `MultiVectorEmbedder` protocol (late-interaction, ColPali-style) with MaxSim scoring and a `page_vectors` store with pooling or quantization to control storage. Also in scope: page rasterization, a two-stage option (text hybrid candidates, then visual rerank), tools `search_pages` and `read_page_image` that pass page images to a vision-capable model, and a documented GPU/throughput plan for encoder load | MaxSim unit tests against hand-computed values (option b); planted chart-only fact retrieved where text search misses it; a planted image-only fact retrieved in the shared text/image vector space proving unified-space retrieval (option a); storage per page under a documented bound; isolation harness registration; egress policy honored |
| 15B `entity_graph` profile | Multi-hop failures remain after the Stage 11 link graph and Stage 12 features | LLM entity and relation extraction against a per-app ontology in config; entity resolution and dedup; entity and relation tables; HippoRAG-style personalized PageRank or LightRAG-style retrieval; tools `search_entities` and `entity_neighborhood`; extraction cost caps and caching | Extraction precision and recall on fixtures with `FakeLLM`; dedup merges aliases without merging distinct entities; PageRank ordering test; a multi-hop golden subset improves versus baseline; cost cap enforced; no restricted-document entities leak through neighborhoods |
| 15C Silo isolation | An app needs separate infrastructure, encryption keys, or contractual isolation | `isolation: silo` accepted by the validator; per-app schema or database chosen by a routing layer; per-app encryption keys for blobs and secrets with rotation; dedicated worker pools and queues; migrations that run across silos | Same stage test suites parametrized to run in silo mode; no shared tables between silos; cross-silo access attempts fail; key rotation keeps data readable; migrations apply to all silos |
| 15D Precise code references | Evals or users show heuristic reference results (`resolved=false`) hurting answers | SCIP indexers run per language in a job and ingested into `symbols` with `resolved=true`; `find_references` prefers precise results and falls back to name-based | Precise references exclude same-name symbols from other scopes on a planted case; fallback works for unsupported languages; incremental re-indexing on push |
| 15E GitLab merge requests, issues, commits, and branches | Questions about why code changed go unanswered, or users need non-default branches | Ingest MR descriptions and discussions (thread-like documents), issues, and commit messages as new collections; branch selection per project; link edges from MRs to tickets and files now resolve | MR threads retrievable and linked; `gitlab_mr_urls` edges resolve to documents; branch filter respected; ACLs inherited from project |
| 15F More connectors and formats | A new source (Google Drive, SharePoint, Notion, email, wikis) is requested | Implement the `Connector` protocol with ACL mapping and recorded fixtures, reuse an existing profile | Connector contract tests, fail-closed ACL tests, isolation harness registration |

### Rules for extensions

- Every extension must be flag-gated per app so it can be disabled without migrations being rolled back.
- Every extension adds its eval cases to the golden sets before implementation and must show a measured improvement to ship by default.
- No extension may weaken Stage 2 isolation guarantees; each registers its retrieval functions with the isolation harness before any other test.

## 8. Dependency map, risks, and budgets

The build is a strict chain through Stage 6, then four parallel profile stages, then quality and product stages. Parallelism is only safe after Stage 6 because the contracts (types, storage, query service, agent tools) are frozen by then.

&#91;embedded content: dependency map · 6 phases, 1 parallel group, gates between phases\]

Each arrow between phases is a gate: the previous phase's `make gate-N` targets must be green on CI before the next phase starts. The highlighted phase is the only place where several agents can work at once.

### Risk register

| Risk | Likelihood | Impact | Mitigation | Where |
| --- | --- | --- | --- | --- |
| ACL mapping errors leak restricted content | Medium | High | Fail-closed mapping in every connector, RLS in the database, adversarial isolation harness registered by every retrieval tool, identity mapping tests | Stages 2, 5, 7 to 11, 14A |
| Secrets in code and chat become searchable | High | High | Redaction before storage, planted-secret tests, scheduled secret-scan of the index | Stages 8, 9 |
| Prompt injection through retrieved content | Medium | Medium | Data-block wrapping, strict tool argument validation, scope injected by the platform, live adversarial tests | Stage 6, 14B |
| Filtered approximate search loses recall | Medium | Medium | Per-collection indexes, EXPLAIN tests, ANN-recall eval | Stages 2, 5, 13 |
| Chat answers are stale or wrong | High | Medium | Lowest trust order, recency weighting, conflict hints, labeled derived units, dates on every hit | Stages 9, 12 |
| Source API limits or changes (Slack, Confluence, Jira) | Medium | Medium | Rate limiters, backoff, export-based backfill, recorded-fixture tests, connector contract tests | Stages 7, 9, 10 |
| Heuristic code references mislead the agent | Medium | Low | Explicit `resolved=false`, precise SCIP indexing as a later option | Stages 8, 15D |
| LLM costs grow (contextual prefixes, distillation, agent loops) | Medium | Medium | Caches keyed by content hash, per-run caps, spend caps, cost in every eval report | Stages 7, 9, 12, 13, 14B |
| Over-engineering before evidence | Medium | Medium | Flags default off until Stage 13 shows uplift; Stage 15 gated on eval evidence | Stages 12, 13, 15 |
| A coding agent changes frozen contracts silently | Medium | High | Contract tests, `CONTRACT_CHANGE.md` process, tags per stage | Section 7 |
| Privacy concerns about ingesting chat | Medium | High | Explicit channel allowlist, DMs never ingested, retention option, human review of what goes in | Stage 9 |

### Budgets and targets

These start as targets, get measured in each stage report, and are tightened or relaxed from data. The corpus size to size them against is an open question in section 9.

| Metric | Target | Measured in |
| --- | --- | --- |
| p95 grep latency, 10,000-document collection | under 500 ms | Stage 4 |
| p95 hybrid search latency (before rerank) | under 1.5 s | Stage 5 |
| Added latency from rerank | tens to low hundreds of ms for a cross-encoder | Stage 12 |
| Added latency from first-move decomposition | 1 to 3 s, skipped for trivial queries | Stage 12 |
| Unchanged re-sync | zero embedding calls and zero row writes | Stages 3, 5 |
| Top-5 source recall on the ctrl-f golden set | 80% initial target | Stage 13 |
| Cross-app or cross-ACL leakage in adversarial suites | zero | Every stage |

## 9. Open questions and deferred decisions

Ten questions need answers from you before or during the early stages, and seven technical choices are deliberately deferred to Stage 13 measurements instead of being decided by opinion.

### Questions that need an answer

| # | Question | Why it matters | Needed by |
| --- | --- | --- | --- |
| 1 | How large is the corpus (repos and lines of code, Confluence pages, chat messages per year, Jira issues)? | Sets budgets, index sizes, sync times, and whether Postgres alone suffices | Stage 0 |
| 2 | Which identity provider will you use, and how do users map to their GitLab, Jira, Slack, and Confluence identities? | ACL enforcement depends on this mapping; unmapped users fail closed | Stage 14A (design earlier) |
| 3 | Where will this run (cloud or on-premises), and is a GPU available? | The embedder decision is settled — EmbeddingGemma 2 runs self-hosted on CPU or consumer GPU — but this still sizes ingestion throughput and decides reranker and Stage 15A visual throughput | Stage 5 |
| 4 | May code and chat be sent to hosted embedding, rerank, and LLM providers? | Embeddings are self-hosted, so this no longer gates them; it still gates hosted rerank, LLM answers, and any future hosted embedder swap | Stage 5 |
| 5 | Are Confluence and Jira Cloud or Data Center, and what are your Slack plan and API limits (API versus export)? | Changes connector APIs, pagination, and sync strategy | Stages 7, 9, 10 |
| 6 | What does the second app's content look like (formats, volume, sensitivity), and do its collections fit the `structured_doc` profile? | Confirms the profile assignments assumed in section 6 and whether visual retrieval is needed | Stage 14D |
| 7 | What are the chat privacy and retention rules, and who owns the channel allowlist? | Determines what is ingested and how long it is kept | Stage 9 |
| 8 | Is the default branch enough for code, and do you want merge requests and issues searchable? | Decides whether Stage 15E is needed early | Stage 8 |
| 9 | Which programming languages dominate your repositories? | Determines tree-sitter grammars and symbol queries to prioritize | Stage 8 |
| 10 | Who reviews and approves golden questions mined from chat, and who owns quality targets? | Stage 13 depends on human review to keep evals trustworthy | Stage 13 |

### Decisions deferred to measurement

| Decision | Default until measured | Decided in |
| --- | --- | --- |
| Embedding model per collection | EmbeddingGemma 2 self-hosted at native 768 dims (decided); Matryoshka truncation to 512/256 held as cost options | Stage 13 |
| Reranker | BGE Reranker v2-m3 (local), off until it shows uplift | Stage 12 and 13 |
| Chunk sizes per profile | Defaults in sections 6 to 10 | Stage 13 sweeps |
| Postgres full-text ranking versus a BM25 extension or search engine | Postgres full-text search | Stage 13 |
| Chat Q&A distillation | Optional, off by default | Stage 13 cost and uplift |
| Link expansion in retrieval | Off | Stage 13 |
| Authority and recency weights | Mild bounded defaults | Stage 13 |

## 10. Appendix: glossary and sources

### Glossary

| Term | Meaning |
| --- | --- |
| App | Tenant boundary that owns an agent configuration and a set of collections (for example ctrl-f) |
| Collection | Retrieval unit inside an app, ingested through one profile from one source |
| Profile | Named bundle of parser, segmenter, enrichers, indexes, retrieval settings, and tools |
| Document | Normalized source object with an ACL, a virtual path, and attributes |
| Unit | Retrievable segment of a document, carrying a locator used as its citation |
| Locator | Profile-specific citation anchor (file and lines, heading path, thread range, ticket section) |
| vpath | Path of a document in the virtual filesystem, for example `/gitlab/repo/src/auth.py` |
| `text` and `enriched_text` | Original unit text (display, grep) versus text with context prefix (lexical and dense indexing) |
| AuthContext | App, principal, and groups derived from credentials and injected by the platform |
| Service context | Ingestion-only context that bypasses ACL filtering but never the app boundary |
| RLS | Postgres row-level security enforcing app and ACL predicates inside the database |
| RRF | Reciprocal rank fusion: merges ranked lists using ranks instead of incomparable scores |
| Derived unit | A model-generated unit (Q&A or summary) that always cites the raw source it came from |
| Evidence ledger | Per-run record of every hit shown to the agent, with citation ids |
| First move | Optional initial step that decomposes the question and seeds evidence before the agent loop |
| Fail closed | When permissions cannot be determined, restrict access rather than allow it |
| Pool and silo | Shared storage with mandatory filters versus dedicated storage per tenant |
| Gate | `make gate-N`, the test run that must pass before the next stage begins |

### Sources

These came from web searches in October 2026. Pages were not independently re-opened or re-benchmarked, and some figures are vendor-reported or from secondary write-ups, so treat numbers as directional and let Stage 13 confirm them on Towel's own data.

| Topic | Source |
| --- | --- |
| Grep versus vector retrieval in agent harnesses | [Is Grep All You Need? How Agent Harnesses Reshape Agentic Search](https://arxiv.org/abs/2605.15184) |
| Coding agents and grep-based retrieval (secondary) | [Why Top AI Coding Agents Dropped Vector Databases for Grep-Based Retrieval](https://www.besthub.dev/articles/why-top-ai-coding-agents-dropped-vector-databases-for-grep-based-retrieval-e16a7a8ee9f5) |
| When agents use RAG versus other methods | [Is RAG dead? What AI agents use instead](https://www.mindstudio.ai/blog/is-rag-dead-what-ai-agents-use-instead) |
| Contextual Retrieval | [Anthropic: Contextual Retrieval](https://anthropic.com/news/contextual-retrieval) |
| Hybrid search patterns in 2026 | [Hybrid RAG in 2026: the patterns that keep winning](https://jacar.es/en/hybrid-rag-in-2026-the-patterns-that-keep-winning/) |
| Rerankers | [Top reranking models to boost RAG accuracy in 2026 (Redis)](https://redis.io/blog/top-reranking-models-rag-accuracy.md), [Best rerankers (Mixpeek)](https://www.mixpeek.com/curated-lists/best-rerankers) |
| Tree-based, vectorless retrieval | [PageIndex on PyPI](https://pypi.org/project/PageIndex/), [PageIndex FinanceBench write-up (vendor-reported)](https://pyshine.com/PageIndex-Vectorless-Reasoning-RAG/) |
| Retrieval system taxonomy (RAPTOR and others) | [Taxonomy of the Retrieval System Framework: Pitfalls and Paradigms](https://arxiv.org/pdf/2601.20131) |
| GraphRAG versus vector RAG | [Stop graphing everything: when GraphRAG actually beats vector RAG](https://venturebeat.com/ai/stop-graphing-everything-when-graphrag-actually-beats-vector-rag), [GraphRAG in production: when vector search fails at multi-hop reasoning](https://tianpan.co/blog/2026-04-12-graphrag-production-when-vector-search-fails-multi-hop-reasoning) |
| Visual document retrieval | [ColPali: Efficient Document Retrieval with Vision Language Models](https://arxiv.org/html/2407.01449v5), [Reproducibility study on late interaction](https://arxiv.org/pdf/2505.07730) |
| EmbeddingGemma 2 (self-hosted multimodal embedder) | [google/embeddinggemma-2 model card](https://huggingface.co/google/embeddinggemma-2) (vendor-reported; all dimensions, benchmark figures, and prefix conventions quoted from the card, to be re-validated in Stage 13) |
| Code chunking | [cAST: structural chunking via abstract syntax tree](https://arxiv.org/pdf/2506.15655) |
| Code search engine design (vendor-reported figures) | [Codixing](https://github.com/ferax564/codixing) |
| Agentic search design | [Question's Gambit: the first move matters in agentic deep search](https://arxiv.org/pdf/2609.14412), [ParallelSearch](https://arxiv.org/pdf/2508.09303), [Search-R1 training study](https://arxiv.org/pdf/2602.19526) |
| Chat ingestion | [From Slack threads to structured knowledge at Snyk](https://snyk.io/articles/from-slack-threads-to-structured-knowledge-implementing-rag-at-snyk/), [Slack sync pitfalls (Twig)](https://www.twig.so/dev/rag-scenarios-and-solutions/data-integration/slack-sync) |
| Multi-tenant isolation | [Multi-tenant RAG with Amazon Bedrock Knowledge Bases](https://aws.amazon.com/blogs/machine-learning/multi-tenant-rag-with-amazon-bedrock-knowledge-bases/), [Multi-tenant AI applications (MetaCTO)](https://www.metacto.com/blogs/multi-tenant-ai-application-architecture), [Multi-tenant RAG with PostgreSQL and pgvector (Render)](https://render.com/articles/multi-tenant-rag-postgresql-pgvector), [Permissions, security, and compliance in RAG pipelines (Unified)](https://unified.to/blog/permissions_security_and_compliance_in_rag_pipelines), [Multi-tenant RAG data isolation guide (Truto)](https://truto.one/blog/how-to-architect-strict-data-isolation-in-multi-tenant-rag-pipelines.md) |
| Document parsing | [Best document parser comparison (Nutrient)](https://www.nutrient.io/blog/best-document-parser-llamaparse-unstructured-reducto/), [Best PDF parsing tools for RAG (Fast.io)](https://www.fast.io/resources/best-pdf-parsing-tools-rag/) |

