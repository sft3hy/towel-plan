# Build Towel — Super RAG Technical Architecture & Implementation Explorer

## Mission

Build a beautiful, production-quality, static website for **Towel (Super RAG)**, an agent-first Retrieval-Augmented Generation platform.

The repository is currently empty. The complete implementation plan is located at:

`../FULL-PLAN.md`

Read that file in its entirety before designing or implementing anything. It is the authoritative source of truth.

Create a polished, GitHub Pages-compatible website that transforms the implementation plan into an engaging, highly visual technical experience for a team of software engineers, AI engineers, and architects.

**This is a frontend-first visualization project.** Do not merely render the Markdown file, create a generic dashboard template, or build a basic documentation website. Design a sophisticated technical microsite that makes a complex software architecture easy to understand, explore, evaluate, and discuss.

The result should feel like a premium developer infrastructure product: editorial-quality typography, precise diagrams, thoughtful motion, exceptional information hierarchy, and a cohesive visual design system.

## 1. Start by understanding the source material

Before writing code:

1. Read `../FULL-PLAN.md` completely, including every stage, appendix, table, constraint, acceptance criterion, and implementation detail.
2. Inventory the document's structure and identify its most important concepts, architectural decisions, dependencies, risks, milestones, and success criteria.
3. Determine the exact implementation stages and their order from the source. Do not assume there are 15 stages simply because Stage 15 is referenced in the overview.
4. Identify every important number, performance target, evaluation threshold, interface, component, and dependency that should be visualized.
5. Build a content map connecting source sections to website pages and visualizations.

Do not truncate the plan, substitute generic descriptions for important technical material, or invent details that are absent from the source.

If the full plan conflicts with the overview in this prompt, use the full plan as authoritative and flag the discrepancy in the site's notes or architecture decision section where appropriate.

## 2. Design direction

Create a distinctive visual identity for Towel.

### Overall aesthetic

Aim for a combination of:
- Premium developer tooling and infrastructure products.
- Modern technical editorial design.
- Sophisticated architecture documentation.
- Interactive engineering diagrams.
- A clean, dark-first visual environment suitable for long technical reading sessions.

Use a near-black or deep graphite foundation, restrained off-white text, subtle borders, carefully chosen accent colors, and muted secondary typography.

Potential accent palette:
- Electric cyan or blue for retrieval and indexing.
- Violet for agents and reasoning.
- Amber for evaluation, warnings, and decisions.
- Green for validation and successful acceptance criteria.
- Neutral grays for infrastructure and supporting elements.

Use color semantically and consistently, not as decoration.

The design must be cohesive, readable, and recognizable as a purpose-built Towel experience. Avoid generic AI landing-page aesthetics, excessive gradients, glowing orbs, gratuitous glassmorphism, and oversized marketing slogans that obscure the engineering content.

### Typography

Use an intentional typography system:
- A distinctive, highly legible sans-serif for headings and interface text.
- A comfortable reading font for long-form technical explanations.
- A monospace font for identifiers, API names, paths, metrics, code, and technical labels.

Use clear size, weight, spacing, and line-length hierarchies. Technical content must remain readable on both desktop and laptop screens.

Use locally available system fonts or a dependable web font with appropriate fallbacks. The site must remain usable if external font requests fail.

### Layout

Build a carefully composed responsive layout featuring:
- A persistent top navigation bar.
- A collapsible or sticky left sidebar for technical sections and implementation stages.
- A central reading and visualization area.
- Optional contextual panels, diagrams, or metrics where they genuinely improve comprehension.

Do not force every page into the same layout. Give the architecture overview, implementation roadmap, retrieval lifecycle, and detailed technical sections layouts appropriate to their content.

Optimize primarily for desktop engineering workflows while supporting tablets and mobile devices.

## 3. Information architecture

Design the information architecture after reading the source. At minimum, aim to support the following experiences, adapting names and sections to the actual plan.

### A. Overview / landing page

Create an exceptional overview that answers, within the first screen or two:

- What is Towel?
- What problem does it solve?
- What makes it agent-first?
- How does it differ from a fixed retrieve-then-generate pipeline?
- What are its primary architectural layers?
- How is the implementation being staged?
- How will success be measured?

Include a strong headline, a concise explanation, and a prominent architectural visualization.

Build an overview of the hierarchy:

Platform → App → Collection → Document → Unit

Represent this as an attractive, interactive hierarchy diagram with meaningful labels and short explanations.

Feature the central design principles from the source, including tool-driven retrieval, hybrid search, source-aware segmentation, grounded citations, and isolation enforced before retrieval.

Present actual success criteria from the full plan as clear metric cards. Preserve the precise targets and distinguish initial targets from finalized acceptance thresholds.

### B. Architecture explorer

Create an interactive architecture page that explains the complete Towel system.

Derive the architecture from the source document rather than inventing components.

Where supported by the plan, visualize:
- Ingestion and connector flows.
- Parsing and source-specific segmentation.
- Enrichment and indexing.
- Lexical and dense retrieval.
- Hybrid result fusion.
- Reranking.
- Agent tool execution.
- Evidence inspection and iterative search.
- Answer generation and source citations.
- Collection, app, and ACL boundaries.
- Evaluation and observability.

Use interactive diagrams with meaningful node labels, directional edges, legends, and contextual explanations.

When a user selects a component, display its responsibility, inputs, outputs, dependencies, and relevant source-plan sections.

Make important flows understandable at a glance. Avoid one enormous, unreadable architecture image.

If useful, divide the architecture into layered views:
1. System context.
2. Ingestion and indexing.
3. Retrieval and agent execution.
4. Security and isolation.
5. Evaluation and quality control.

Include a concise explanation of why the architecture makes each major design choice.

### C. Agentic retrieval lifecycle

Give special attention to the defining feature of Towel: the agent operates a toolbox of retrieval primitives instead of following a fixed retrieval pipeline.

Create a polished, interactive flow diagram illustrating the lifecycle described in the source, potentially including:

Question → Agent planning → Search tool selection → Retrieval → Evidence inspection → Search reformulation or expansion → Sufficiency assessment → Grounded answer with citations

This sequence is illustrative only. Verify the actual behavior and stopping conditions against `FULL-PLAN.md` before implementing it.

Show where the agent uses grep, glob, lexical search, hybrid search, outline navigation, symbol lookup, link traversal, and file reads, where applicable.

Explain how budgets, evidence quality, and stopping conditions constrain the agent.

Make the distinction between fixed-pipeline RAG and agent-directed retrieval visually intuitive.

If the plan defines a specific sufficiency mechanism, escalation policy, or budget model, visualize that exact design rather than substituting a generic one.

### D. Search and indexing visualizations

Create detailed visuals explaining the retrieval stack and its alternatives.

Where applicable, illustrate:
- Virtual filesystem and baseline search capabilities.
- Exact-match and identifier retrieval.
- Lexical search.
- Dense vector search.
- Hybrid search.
- Reciprocal Rank Fusion (RRF).
- Reranking.
- Source-aware chunking.
- Outline and structural navigation.
- Link-based multi-hop exploration.

Use side-by-side comparisons, flow diagrams, or small explanatory charts to communicate why the components complement one another.

Clearly distinguish:
- Features required on day one.
- Optional retrieval enhancements.
- Deferred capabilities.
- Decisions that depend on evaluation results.

Never fabricate benchmark scores or imply that a technique has demonstrated a performance improvement on Towel's corpus unless the source provides evidence.

### E. Implementation roadmap

This should be one of the most useful pages for the engineering team.

Extract every implementation stage from the full plan and render the complete roadmap.

For each stage, show:
- Stage number and title.
- Purpose.
- Deliverables.
- Dependencies and prerequisites.
- Relevant packages, interfaces, or data structures.
- Testing and acceptance criteria.
- Exit conditions.
- Key risks or architectural decisions, if present.

Build a polished roadmap view with a clear progression through the stages. Provide a compact overview and an expandable, detailed view for each stage.

Use a vertical timeline, grouped phases, or another appropriate layout based on the actual number and structure of stages.

If stages have dependencies that do not follow a simple linear sequence, represent them as a dependency graph instead of falsely implying that every stage depends on the previous stage.

Provide clear navigation from each stage to the corresponding detailed plan content.

The roadmap must include every stage. Do not summarize away important work.

### F. Data model and collection profiles

Explain the platform's hierarchy and configuration-driven onboarding model.

Visualize the relationship between platform, apps, collections, documents, and units, along with any other entities defined in the plan.

If the source defines profiles as bundles of connectors, parsers, segmenters, enrichers, and indexers, represent those relationships visually.

Show how the initial `ctrl-f` application uses its planned collections:
- `gitlab`
- `confluence`
- `jira`
- `chat`
- `knowledge_doc`

Then explain how the second application and its example collections demonstrate extensibility.

Clearly communicate the distinction between logical separation and physical isolation, including the v1 scope and deferred silo-mode seam.

Use examples drawn from the source document. Avoid adding unsupported schema fields or implying that example collections are already implemented.

### G. Security and isolation

Create a dedicated, visually prominent explanation of the security model.

Explain the requirement that app, collection, and ACL restrictions be enforced in the database before retrieval, not merely in the prompt.

Visualize:
- Where filters are applied.
- Which boundaries constrain a query.
- How the design prevents cross-app and cross-ACL leakage.
- How isolation is tested.
- Which stronger isolation capabilities are deferred.

Use an illustrative adversarial access scenario if it helps explain the threat model, but label it as an example rather than a real test result.

### H. Evaluation and acceptance criteria

Build a compelling evaluation page that turns the source's success criteria into a clear engineering scorecard.

Include the actual metrics, thresholds, corpus assumptions, latency objectives, test requirements, and quality measures defined in the plan.

Where relevant, separate:
- Retrieval quality.
- Answer quality and citation correctness.
- Latency.
- Security and isolation.
- Regression tests.
- Extensibility and onboarding.
- Operational constraints.

If the plan includes a golden dataset, evaluation harness, benchmark matrix, or adversarial suite, visualize its structure and workflow.

Make it easy to distinguish a proposed target from a measured result. Do not display fabricated live metrics, completion percentages, benchmark results, or test pass indicators.

### I. Technical decision record

Create a structured view of the major architectural decisions and trade-offs documented in the plan.

For each important decision, show:
- Decision.
- Rationale.
- Alternatives considered.
- Benefits.
- Costs or risks.
- Constraints.
- Deferred alternatives, if any.

Use comparison tables and small diagrams where appropriate. Include only information supported by the source or clearly labeled engineering interpretation.

### J. Full plan reference

The website must preserve access to the complete technical plan.

Create readable, navigable technical documentation based on `FULL-PLAN.md`, with:
- A generated table of contents.
- Hierarchical headings.
- Readable code blocks.
- Properly formatted tables.
- Lists and checklists.
- Internal section links.
- Cross-links to related diagrams and roadmap stages.
- Appropriate treatment of inline code and technical terminology.

Preserve the meaning and important detail of the source. Do not silently omit sections.

The visual overview should make the plan easier to understand, not replace the plan.

## 4. Charts, diagrams, and visual storytelling

Charts and diagrams are a core requirement, not an afterthought.

Build a coherent set of high-quality, technically accurate visualizations derived from the plan.

Prioritize:
- Interactive system architecture diagrams.
- Agentic retrieval lifecycle.
- Ingestion and indexing flows.
- Retrieval stack comparisons.
- Platform/app/collection hierarchy.
- Implementation roadmap and dependencies.
- Evaluation scorecards.
- Security boundary diagrams.
- Configuration-driven onboarding flow.
- Decision trade-off matrices.

Use native SVG or a suitable diagramming library for diagrams that benefit from interactivity. Use a charting library only where actual quantitative data exists.

Prefer diagrams for system relationships and process flows; use charts for genuine numerical comparisons. Never invent numerical data just to fill a chart.

Diagrams must include readable labels, consistent visual semantics, clear arrow direction, useful legends, and accessible contrast.

Support zooming, panning, selection, or contextual detail where it meaningfully improves usability.

Provide a readable alternative on narrow screens. Do not simply shrink complex diagrams until their labels are illegible.

## 5. Frontend implementation requirements

Choose the smallest, most maintainable frontend stack that supports a polished, interactive experience.

A suitable default is:
- Vite.
- React.
- TypeScript.
- A cohesive component library or carefully designed custom components.
- A suitable diagramming library such as React Flow when its capabilities justify the dependency.
- A charting library only when the plan provides meaningful quantitative data.
- Lucide icons or another consistent icon set.

You may choose an alternative if it materially improves the result, but explain the trade-off briefly in the README.

Use the package manager and conventions appropriate to the existing repository. Since the repository is currently empty, establish a clean and conventional project structure.

Requirements:
- Static build output.
- No backend server.
- No database.
- No runtime API dependency.
- No secrets or API keys.
- All primary functionality works after the site is built and hosted as static files.
- All required content is bundled locally at build time.
- No dependence on a local development server for production functionality.

Use reusable components and a consistent design system. Keep content, diagrams, application logic, and presentation sensibly separated.

Do not build an unnecessary backend or turn this into a full-stack application.

## 6. GitHub Pages deployment

Configure the project for GitHub Pages deployment.

Requirements:
- Correct handling of the repository's GitHub Pages base path.
- Production asset paths must work when hosted under `https://<username>.github.io/<repository>/`.
- Client-side navigation must work when hosted under a repository subpath.
- Avoid relying on server-side routing or rewrite rules.
- Provide a reliable GitHub Actions workflow that builds and deploys the static site from the repository.
- Pin action versions to appropriate stable releases.
- Configure appropriate permissions and Pages deployment settings.
- Document the one-time repository settings needed to enable GitHub Pages.
- Ensure a failed build does not publish a broken site.

Prefer hash-based routing or another GitHub Pages-compatible approach where appropriate.

The website should be easy to preview locally with standard development commands.

## 7. UX details that distinguish an excellent implementation

Implement the following where appropriate:
- Responsive, persistent navigation.
- Search across documentation sections, implementation stages, and technical terms.
- Keyboard-accessible navigation and interactive controls.
- Expand/collapse sections.
- Breadcrumbs or contextual navigation for deeply nested material.
- Copyable code blocks.
- Deep links to important sections and individual stages.
- Consistent source references linking visual explanations back to the full plan.
- Subtle, purposeful transitions.
- Clear hover, focus, active, and selected states.
- A polished empty state and not-found experience.
- Light/dark theme support if it can be implemented without compromising the primary design.
- Reduced-motion support.
- Useful page titles and metadata.

Avoid adding features merely to inflate the feature list. Prioritize excellent reading, navigation, and technical comprehension.

## 8. Content accuracy and traceability

The full plan is the source of truth.

Create a reliable mapping between the source and the website so that an engineer can verify any important claim or diagram.

For key technical decisions, metrics, architecture nodes, and implementation stages, include a source-section reference or link to the relevant section of the full-plan view.

Clearly label content as one of:
- Defined by the implementation plan.
- An illustrative explanation of the proposed design.
- An open question or unresolved decision.
- A deferred capability.
- A proposed acceptance target.
- A measured result, but only when actual evidence exists.

Do not present planned capabilities as already implemented.

Do not invent:
- Benchmark results.
- Completion status.
- Performance improvements.
- Security guarantees beyond the stated design and tests.
- Dependencies or integrations that the plan does not specify.
- Implementation details that contradict the plan.

If the source leaves a decision unresolved, make that uncertainty visible rather than silently choosing an answer.

## 9. Accessibility and performance

Treat accessibility and performance as part of the implementation, not a final polish step.

Requirements:
- Semantic HTML.
- Logical heading hierarchy.
- Keyboard-operable controls.
- Visible focus states.
- Accessible labels for interactive diagrams.
- Sufficient color contrast.
- Reduced-motion support.
- Responsive layouts without horizontal overflow.
- Optimized production assets.
- Lazy loading where useful.
- No unnecessarily large dependencies.
- No avoidable console errors.
- No external requests required for essential content.

The experience should remain smooth on a normal engineering laptop and should not require an expensive GPU or backend to render its diagrams.

## 10. Testing and quality assurance

Create automated tests for the important behaviors.

At minimum, verify:
- The application builds successfully for production.
- The website works under a non-root GitHub Pages base path.
- Every implementation stage in the source appears in the roadmap.
- Important plan sections remain accessible in the documentation.
- Navigation and internal links work.
- Diagrams render and expose their key labels.
- Search returns relevant local documentation results.
- No fabricated benchmark or completion data is included.
- Layouts remain usable at desktop and mobile widths.
- Accessibility checks catch obvious structural and interaction issues.

If practical, add a browser-based smoke test covering the landing page, roadmap, architecture explorer, search, and a deep link to an implementation stage.

Run the tests and production build yourself. Fix failures rather than simply documenting them.

## 11. Suggested visual component system

Create reusable components where they improve consistency, such as:
- `AppShell`
- `TopNavigation`
- `SidebarNavigation`
- `PageHeader`
- `MetricCard`
- `ArchitectureDiagram`
- `ProcessFlow`
- `StageTimeline`
- `StageDetail`
- `DecisionTable`
- `SourceReference`
- `SectionHeading`
- `CodeBlock`
- `SearchDialog`
- `Callout`
- `StatusLabel`

These are suggestions, not mandatory names. Adapt the component system to the actual design.

Create a consistent spacing scale, typography scale, color tokens, border treatments, and interaction states.

Every component should feel like part of the same carefully designed product.

## 12. Execution strategy

Work autonomously through the following sequence.

### Phase 1 — Source analysis

Read the complete plan, map its structure, identify the implementation stages, extract metrics and architectural concepts, and define the content architecture.

### Phase 2 — Design system and visual prototype

Establish the visual direction, typography, colors, navigation, page layouts, and core interaction patterns.

Implement the landing page and at least one excellent interactive architecture visualization early. Do not spend the entire effort on scaffolding.

### Phase 3 — Complete experience

Implement the remaining pages, all roadmap stages, source references, documentation, search, diagrams, and supporting content.

### Phase 4 — Deployment and testing

Configure GitHub Pages, add automated tests, run the production build, validate the repository subpath, and inspect the finished site at desktop and mobile widths.

### Phase 5 — Final polish

Review the website as if presenting it to a senior engineering team.

Check typography, alignment, diagram readability, navigation, density, whitespace, interaction feedback, technical accuracy, and consistency.

Replace any generic or placeholder-looking areas with intentional design.

Do not stop after generating a plan or scaffold. Complete the actual implementation in the repository.

If a minor detail is ambiguous, make a reasonable, reversible decision and continue. Ask for clarification only when a genuine blocker prevents a correct implementation.

## 13. Definition of done

The task is complete when:

1. The repository contains a working, maintainable frontend implementation.
2. The complete plan has been read and accurately represented.
3. The website provides a compelling executive-level overview and a detailed engineering-level exploration.
4. The site contains multiple meaningful, polished diagrams and visualizations.
5. Every implementation stage is represented and navigable.
6. Important architectural decisions, dependencies, metrics, and acceptance criteria are traceable to the source.
7. The site looks intentionally designed rather than like a default documentation template.
8. Search, navigation, and interactive visualizations work.
9. Responsive and accessibility basics are verified.
10. Automated tests and the production build pass.
11. GitHub Pages deployment is configured and documented.
12. The site requires no backend or runtime API.
13. No important content is fabricated or silently omitted.

## 14. Final response

When finished, report:
- The design and architecture of the website.
- The pages and major visualizations implemented.
- The frontend stack and key dependencies.
- The tests and production build results.
- The GitHub Actions deployment workflow and any one-time repository configuration still required.
- Any remaining limitations or source-plan ambiguities.

Start by reading `../FULL-PLAN.md`, then implement the complete website. Optimize for a result that the engineering team will genuinely enjoy exploring and reading.
