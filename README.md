# Towel — Super RAG Architecture Explorer

An interactive, mobile-friendly technical website that turns the
[`FULL-PLAN.md`](FULL-PLAN.md) implementation plan for **Towel** (a multi-app,
agent-first RAG platform) into something you can explore, search, and
navigate — with a polished visual identity, many diagrams, and complete
reference coverage of every stage.

Deployed on GitHub Pages: `https://<user>.github.io/towel-plan/`

## What's inside

| Route | Page |
|---|---|
| `#/` | Overview — thesis, architecture summary, principles, success criteria, roadmap strip |
| `#/architecture` | Architecture explorer — interactive system-context, ingestion, retrieval-loop, security and evaluation diagrams with detail panels |
| `#/lifecycle` | Agentic retrieval lifecycle — step-through player + auto-play (respects reduced motion) |
| `#/retrieval` | Search & indexing — retrieval stack, worked RRF example, provenance-labeled research figures |
| `#/roadmap` | Implementation roadmap — dependency-true stage graph (Stages 0–15), parallel profile band, gates |
| `#/stage/:n` | Full untrimmed text of one stage (incl. sub-stages `#/stage/14A`, `#/stage/15C`) |
| `#/data` | Data model & collection profiles — entity map, invariants, both apps, locators, onboarding recipes |
| `#/security` | Security & isolation — enforcement chain, RLS predicate, adversarial walkthrough |
| `#/evaluation` | Evaluation & acceptance — metric families, targets ledger, golden schema, ablation matrix |
| `#/decisions` | Technical decision record — choices, alternatives, costs, deferrals, open questions, risks |
| `#/plan` · `#/plan/:section` | The complete plan text, navigable and cross-linked |

⌘K / Ctrl+K / `/` opens the local search palette (fully bundled, no network).

## Accuracy rules the build enforces

- `FULL-PLAN.md` at the repo root is the **authoritative source**.
  `npm run build` copies it into `src/content/full-plan.md` (gitignored) and
  bundles it verbatim — the site can never drift silently.
- A test asserts the bundled copy is byte-identical to the root document.
- Research figures carry their original provenance labels (`vendor-reported`,
  `directional`); every target is labeled `proposed-target` /
  `hard-requirement` / `invariant`. Tests assert that **no page claims a
  measured result** — there are none yet; Stage 13 produces the first.
- Every diagram node and data claim carries a `SourceReference` chip; a test
  verifies all such refs resolve to real headings in the plan.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # sync plan → typecheck → bundle (dist/)
npm test           # 37 tests: content accuracy, UI, base-path safety
```

## Design decisions

- **Vite + React + TypeScript**, hand-built SVG/CSS diagrams (no diagram
  library) as a deliberate choice: full control over
  accessibility, print quality, mobile reflow, and bundle size.
- **Hash routing + relative asset base (`./`)** so the static build works
  under any GitHub Pages subpath with zero server rewrites. A test asserts
  no absolute `/assets/` URLs leak into the bundle.
- **Zero runtime backend, zero secrets** — everything is bundled at build
  time. Search runs client-side over the bundled index.
- Dark-first theme (graphite + cyan/violet/amber/green semantic accents) with
  a full light theme, keyboard operation, focus states, and
  `prefers-reduced-motion` support.

## One-time GitHub Pages setup (new repository)

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Merge to `main` — `.github/workflows/deploy.yml` builds, tests, and
   publishes `dist/`. A failed build or failed test never publishes.

No tokens, no secrets, no other configuration is required.
