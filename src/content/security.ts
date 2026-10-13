/**
 * Security & isolation content (§2 multi-tenancy, §3 key decisions,
 * Stage 2 policies, Stage 5 harness, Stage 14A identity, §8 risk register).
 */

export interface EnforcementPoint {
  order: number
  where: string
  what: string
  failsHow: string
  stage: string
}

/** Where filters are applied — always before any row comes back. */
export const ENFORCEMENT_POINTS: EnforcementPoint[] = [
  {
    order: 1,
    where: 'Platform edge (credentials)',
    what: 'Tokens and API keys become an AuthContext (app, principal, groups). URL app must match the token’s app or 403. The agent never constructs scope.',
    failsHow: '401 invalid/expired · 403 app mismatch · unmapped users see only app-wide documents',
    stage: 'Stage 14A',
  },
  {
    order: 2,
    where: 'Connection checkout',
    what: 'connect(auth) opens a transaction and SET LOCAL towel.app_id and towel.principals. Repositories accept only sessions produced this way.',
    failsHow: 'Repository call without a valid session raises IsolationError · pooled connections never leak settings (tested explicitly)',
    stage: 'Stage 2',
  },
    {
    order: 3,
    where: 'Tool schemas & arguments',
    what: 'Schemas never contain app_id, principal, or groups. collections arguments are enums of the caller’s app only. Attempts to set scope fields are rejected as error results and audited.',
    failsHow: 'Unknown tool / unknown collection / scope-field injection → error result, never executed',
    stage: 'Stage 6',
  },
  {
    order: 4,
    where: 'QueryService',
    what: 'Resolves permitted collections for the app before retrieval; metadata and date filters apply inside both retrievers, before ranking.',
    failsHow: 'Unknown collection → error listing only the caller’s own collections',
    stage: 'Stage 5',
  },
  {
    order: 5,
    where: 'Postgres row-level security',
    what: 'FORCE ROW LEVEL SECURITY on every retrievable table: app_id = current_setting(’towel.app_id’) AND (acl = ’{}’ OR acl && principals). Service context bypasses only the ACL half — never the app boundary.',
    failsHow: 'Missing session settings → zero rows · NOBYPASSRLS application role · no writes to audit_log',
    stage: 'Stage 2',
  },
  {
    order: 6,
    where: 'Rendering & tools output',
    what: 'Snippets, context lines, neighbor listings, counts, traces, and error messages are built only from already-authorized rows. Invisible paths answer not-found, never forbidden.',
    failsHow: 'No distinguishable forbidden error · restricted neighbors never named',
    stage: 'Stages 4–11',
  },
]

export const RLS_POLICY_SQL = `-- enabled with FORCE ROW LEVEL SECURITY on every retrievable table
-- (documents, units, unit_embeddings, symbols, outline_nodes, links, document_bodies)

CREATE POLICY tenant_isolation ON units
  USING (
    app_id = current_setting('towel.app_id', true)
    AND (
      acl = '{}'
      OR acl && string_to_array(current_setting('towel.principals', true), ',')
      OR current_setting('towel.service', true) = 'on'   -- ingestion only; app_id half still binds
    )
  );

-- If the settings are absent, policies return zero rows: fail closed.`

export interface AdversaryScenario {
  id: string
  attack: string
  vector: string
  defense: string
  outcome: string
  stage: string
}

/** Illustrative walkthrough — labeled as an example, not a real test result. */
export const ADVERSARY_EXAMPLE: AdversaryScenario = {
  id: 'leak-attempt',
  attack: '“Summarize PAY-1423’s incident notes” — asked by a principal who is not in group:sre, from app-2, with forged arguments.',
  vector: 'Three leakage attempts in one request: cross-app reach, ACL elevation, and prompt injection inside retrieved text.',
  defense:
    'AuthContext pins the app to app-2 (its manifest has no jira collection at all). Had the principal been in ctrl-f without the group, RLS would filter the document before ranking. A tool argument forged to carry app_id or principal is rejected by strict schema validation. Any instruction-like text inside retrieved documents sits inside escaped data blocks and is treated as data.',
  outcome:
    'Not-found or empty results at every layer — no snippets, no counts, no “this exists but you cannot see it”. Every attempt lands in audit_log. Labeled example of the design’s threat model; the real checks are the automated adversarial suites that every retrieval tool must pass to gate.',
  stage: 'Stages 2 · 5 · 6 · 14A',
}

export const DEFERRED_ISOLATION = [
  {
    title: 'Silo mode (Stage 15C)',
    body: 'isolation: silo is rejected by the v1 validator with a pointer forward. When contractual isolation arrives: per-app schema or database chosen by a routing layer, per-app encryption keys for blobs and secrets with rotation, dedicated worker pools and queues, migrations across silos, and every stage suite re-run parametrized in silo mode.',
  },
  {
    title: 'What v1 already guarantees',
    body: 'Pooled storage with mandatory filters: logical separation proven by adversarial tests — no cross-app vocabulary in prompts or tool enums, no cross-app or cross-ACL rows in any test, zero leakage across 1,000 concurrent interleaved requests on a shared pool (Stage 14D).',
  },
]

/** Rows of the §8 risk register that concern security directly. */
export const SECURITY_RISKS = [
  { risk: 'ACL mapping errors leak restricted content', likelihood: 'Medium', impact: 'High', mitigation: 'Fail-closed mapping in every connector, RLS in the database, adversarial harness registered by every retrieval tool, identity mapping tests', where: 'Stages 2, 5, 7–11, 14A' },
  { risk: 'Secrets in code and chat become searchable', likelihood: 'High', impact: 'High', mitigation: 'Redaction before storage, planted-secret tests, scheduled secret-scan of the index', where: 'Stages 8, 9' },
  { risk: 'Prompt injection through retrieved content', likelihood: 'Medium', impact: 'Medium', mitigation: 'Data-block wrapping, strict argument validation, scope injected by the platform, live adversarial tests', where: 'Stages 6, 14B' },
  { risk: 'Privacy concerns about ingesting chat', likelihood: 'Medium', impact: 'High', mitigation: 'Explicit channel allowlist, DMs never ingested, retention option, human review of what goes in', where: 'Stage 9' },
]
