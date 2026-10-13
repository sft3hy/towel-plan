import planRaw from '../content/full-plan.md?raw'

/**
 * Parses the bundled copy of FULL-PLAN.md into navigable sections.
 * This is the single source of truth shared by the plan reader, the
 * stage pages, search, and every "view in plan" source reference.
 */

export interface PlanHeading {
  level: number // 2 | 3 | 4
  text: string // cleaned heading text (markdown escapes removed)
  id: string // stable anchor id
  line: number // line index within the raw document
}

export function slugify(heading: string): string {
  return heading
    .replace(/\\([_*\[\]`])/g, '$1') // unescape markdown
    .replace(/`/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** All h2/h3/h4 headings in document order. */
export function parseHeadings(md: string = planRaw): PlanHeading[] {
  const lines = md.split('\n')
  const headings: PlanHeading[] = []
  let inFence = false
  const seen = new Map<string, number>()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{2,4})\s+(.*)$/.exec(line)
    if (!m) continue
    const text = m[2].replace(/\\([_*\[\]])/g, '$1').replace(/`/g, '').trim()
    let id = slugify(text)
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n > 0) id = `${id}-${n + 1}`
    headings.push({ level: m[1].length, text, id, line: i })
  }
  return headings
}

export const headings = parseHeadings()

/** Raw markdown of the section introduced by `heading`, up to the next
 *  heading of the same or shallower level. */
export function sectionMarkdown(heading: RegExp, md: string = planRaw): string {
  const lines = md.split('\n')
  let inFence = false
  let start = -1
  let level = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    if (start < 0) {
      const m = /^(#{2,4})\s+(.*)$/.exec(line)
      if (m && heading.test(m[2].replace(/\\_/g, '_'))) {
        start = i
        level = m[1].length
      }
    } else if (/^#{2,4}\s+/.test(line) && line.length > 0) {
      const lv = /^(#+)/.exec(line)![1].length
      if (lv <= level) return lines.slice(start, i).join('\n').trimEnd()
    }
  }
  return start >= 0 ? lines.slice(start).join('\n').trimEnd() : ''
}

/** Heading text for a section id (first matching heading). */
export function headingTextForId(id: string): string | undefined {
  return headings.find((h) => h.id === id)?.text
}

/** Find a heading whose text matches the regex (cleaned text). */
export function findHeading(re: RegExp): PlanHeading | undefined {
  return headings.find((h) => re.test(h.text))
}

// ---------------------------------------------------------------------------
// Stable references used by SourceReference chips across the site.
// ---------------------------------------------------------------------------

export const PLAN_SECTIONS: Record<string, { pattern: RegExp; label: string }> = {
  purpose: { pattern: /^1\. Purpose/, label: '§1 Purpose, scope, thesis' },
  research: { pattern: /^2\. Research findings/, label: '§2 Research findings' },
  architecture: { pattern: /^3\. System architecture/, label: '§3 System architecture' },
  stack: { pattern: /^4\. Tech stack/, label: '§4 Tech stack & repo layout' },
  dataModel: { pattern: /^5\. Data model/, label: '§5 Data model' },
  config: { pattern: /^6\. Configuration spec/, label: '§6 Configuration spec' },
  howToRun: { pattern: /^7\. How to run/, label: '§7 How to run this plan' },
  dependencies: { pattern: /^8\. Dependency map/, label: '§8 Dependencies, risks, budgets' },
  openQuestions: { pattern: /^9\. Open questions/, label: '§9 Open questions' },
  appendix: { pattern: /^10\. Appendix/, label: '§10 Glossary & sources' },
}

export function sectionRef(key: keyof typeof PLAN_SECTIONS): { id: string; label: string } {
  const { pattern, label } = PLAN_SECTIONS[key]
  const h = findHeading(pattern)
  return { id: h ? h.id : '', label }
}

/** Extract the full raw markdown for stage N ("## Stage 8: ..."). */
export function stageMarkdown(n: number, md: string = planRaw): string {
  return sectionMarkdown(new RegExp(`^Stage ${n}[:\\s]`), md)
}

/** Extract a stage subsection such as "Stage 14A: ..." */
export function stageSubsectionMarkdown(sub: string, md: string = planRaw): string {
  return sectionMarkdown(new RegExp(`^Stage ${sub}[:\\s]`), md)
}

/** Count acceptance test items ("1. ..." list entries) in an Acceptance
 *  tests block for a stage. */
export function acceptanceTestCount(stageN: number, md: string = planRaw): number {
  const text = stageN === 14 ? stageMarkdown(14, md) : stageMarkdown(stageN, md)
  let count = 0
  for (const block of text.split(/(?=\*\*Acceptance tests)/)) {
    if (!block.startsWith('**Acceptance tests')) continue
    const body = block.slice(block.indexOf('.**') + 3).split(/\*\*Gate/)[0]
    const items = body.match(/^\s*\d+\.\s/gm)
    count += items ? items.length : 0
  }
  if (count === 0) {
    // Stage 15 uses a table of extensions instead of numbered lists.
    const stage15 = stageMarkdown(15, md)
    const rows = stage15.split('\n').filter((l) => /^\| 15[A-F]/.test(l))
    count = rows.length
  }
  return count
}

// ---------------------------------------------------------------------------
// Cross-linking: turn "section 5" and "Stage 8" prose mentions in the plan
// itself into navigable links. Code fences and inline code are untouched.
// ---------------------------------------------------------------------------

const numberToSectionId = new Map<string, string>()
for (const [key, { pattern }] of Object.entries(PLAN_SECTIONS)) {
  const h = findHeading(pattern)
  const num = /^(\d+)\./.exec(pattern.source)?.[1]
  if (h && num) numberToSectionId.set(num, h.id)
  void key
}

function linkifySegment(text: string): string {
  // "section 5" / "sections 6 to 10" -> single mentions become links
  text = text.replace(/\bsection (\d{1,2})\b/g, (m, num: string) => {
    const id = numberToSectionId.get(num)
    return id ? `[section ${num}](#/plan/${id})` : m
  })
  text = text.replace(/\bStage (\d{1,2})([A-F])?\b/g, (m, num: string, sub?: string) => {
    const n = parseInt(num, 10)
    if (Number.isNaN(n) || n > 15) return m
    if (sub) return `[Stage ${num}${sub}](#/plan/${stageHeadingId(num + sub)})`
    return `[Stage ${num}](#/stage/${num})`
  })
  return text
}

const stageIdsCache = new Map<string, string>()
function stageHeadingId(tag: string): string {
  if (stageIdsCache.has(tag)) return stageIdsCache.get(tag)!
  const h = findHeading(new RegExp(`^Stage ${tag}[:\\s]`))
  const id = h ? h.id : 'plan'
  stageIdsCache.set(tag, id)
  return id
}

/** Apply cross-linking outside fenced blocks, tables-as-lines are fine. */
export function linkifyPlanMarkdown(md: string): string {
  const out: string[] = []
  let inFence = false
  for (const line of md.split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence || /^#{2,4}\s/.test(line)) {
      out.push(line)
      continue
    }
    // Protect inline code spans
    const parts = line.split(/(`[^`\n]+`)/)
    out.push(
      parts.map((p) => (p.startsWith('`') ? p : linkifySegment(p))).join(''),
    )
  }
  return out.join('\n')
}

export { planRaw }
