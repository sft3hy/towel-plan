import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { planRaw, headings, stageMarkdown, acceptanceTestCount, linkifyPlanMarkdown, sectionRef } from '../src/lib/plan'
import { STAGES, PHASES, stageByN } from '../src/content/stages'
import { SUCCESS_METRICS } from '../src/content/overview'
import { SEARCH_INDEX, searchDocs } from '../src/lib/search'
import { ARCH_VIEWS } from '../src/content/architecture'
import { KEY_DECISIONS, OPEN_QUESTIONS, RISK_REGISTER } from '../src/content/decisions'

/**
 * Content accuracy tests: every stage present, the bundled plan is the
 * complete source document, references resolve, and no fabricated
 * “measured” results exist anywhere in the site data.
 */

describe('roadmap completeness', () => {
  it('includes every stage 0–15 from the plan, in order', () => {
    expect(STAGES.map((s) => s.n)).toEqual(
      Array.from({ length: 16 }, (_, i) => i),
    )
  })

  it('represents stage 14 sub-stages 14A–14D and 15 extensions 15A–15F', () => {
    expect(stageByN(14)?.subStages?.map((s) => s.id)).toEqual(['14A', '14B', '14C', '14D'])
    expect(stageByN(15)?.subStages?.map((s) => s.id)).toEqual(['15A', '15B', '15C', '15D', '15E', '15F'])
  })

  it('uses the plan’s real dependency edges (not a fake linear chain)', () => {
    expect(stageByN(0)?.dependsOn).toEqual([])
    expect(stageByN(6)?.dependsOn).toEqual([5])
    expect(stageByN(11)?.dependsOn).toEqual([7, 8, 9, 10])
    expect(stageByN(12)?.dependsOn).toEqual([11])
    expect(stageByN(13)?.dependsOn).toEqual([6])
    expect(stageByN(14)?.dependsOn).toEqual([12, 13])
    // parallel band
    for (const n of [7, 8, 9, 10]) expect(stageByN(n)?.parallelGroup).toBe('profiles')
    // dependencies never point forward
    for (const s of STAGES) for (const d of s.dependsOn) expect(d).toBeLessThan(s.n)
  })

  it('phases partition all stages', () => {
    const inPhases = PHASES.flatMap((p) => STAGES.filter((s) => s.phase === p.id).map((s) => s.n)).sort((a, b) => a - b)
    expect(inPhases).toEqual(Array.from({ length: 16 }, (_, i) => i))
  })

  it('every stage card field is populated', () => {
    for (const s of STAGES) {
      expect(s.name.length).toBeGreaterThan(3)
      expect(s.visible.length).toBeGreaterThan(3)
      expect(s.gate.length).toBeGreaterThan(3)
      expect(s.tags.length).toBeGreaterThan(2)
    }
  })
})

describe('full plan fidelity', () => {
  it('bundled plan is byte-identical to the source FULL-PLAN.md', () => {
    const source = readFileSync(join(__dirname, '..', 'FULL-PLAN.md'), 'utf8')
    expect(planRaw.replace(/\r\n/g, '\n')).toBe(source.replace(/\r\n/g, '\n'))
  })

  it('all ten top-level sections are present and navigable', () => {
    for (const key of ['purpose', 'research', 'architecture', 'stack', 'dataModel', 'config', 'howToRun', 'dependencies', 'openQuestions', 'appendix'] as const) {
      const ref = sectionRef(key)
      expect(ref.id, `section ${key}`).not.toBe('')
      expect(headings.some((h) => h.id === ref.id)).toBe(true)
    }
  })

  it('every stage 0–14 section exists in the plan with its card headings', () => {
    for (let n = 0; n <= 14; n++) {
      const md = stageMarkdown(n)
      expect(md.length, `stage ${n} text`).toBeGreaterThan(500)
      expect(md).toMatch(/Goal/)
      expect(md).toMatch(/Acceptance tests/)
      expect(md).toMatch(/Gate/)
      expect(md).toMatch(/Pitfalls/)
    }
    const s15 = stageMarkdown(15)
    expect(s15).toMatch(/visual_doc/)
    expect(s15).toMatch(/Rules for extensions/)
  })

  it('acceptance test counts are extracted', () => {
    expect(acceptanceTestCount(0)).toBeGreaterThanOrEqual(6)
    expect(acceptanceTestCount(5)).toBeGreaterThanOrEqual(12)
    expect(acceptanceTestCount(14)).toBeGreaterThanOrEqual(20)
  })

  it('cross-links stage and section mentions without corrupting code fences', () => {
    const out = linkifyPlanMarkdown(planRaw)
    expect(out).toContain('](#/stage/12)')
    expect(out).toContain('](#/plan/')
    // code fences survive
    expect((out.match(/```/g) ?? []).length).toBe((planRaw.match(/```/g) ?? []).length)
    // links inside code blocks are not injected
    const fence = out.split('```')[1] ?? ''
    expect(fence).not.toContain('#/stage/')
  })
})

describe('search', () => {
  it('indexes stages, tools, glossary, and pages', () => {
    expect(SEARCH_INDEX.some((d) => d.kind === 'Stage' && d.title.includes('Stage 13'))).toBe(true)
    expect(SEARCH_INDEX.some((d) => d.title.toLowerCase().includes('grep'))).toBe(true)
    expect(SEARCH_INDEX.some((d) => d.kind === 'Glossary')).toBe(true)
  })

  it('returns relevant local results', () => {
    const rrf = searchDocs('RRF')
    expect(rrf.length).toBeGreaterThan(0)
    expect(searchDocs('fail closed').some((r) => /fail closed/i.test(r.title + r.snippet))).toBe(true)
    expect(searchDocs('stage 8').some((r) => r.to === '#/stage/8')).toBe(true)
    expect(searchDocs('zzzzqqq')).toHaveLength(0)
  })

  it('all search targets point at valid routes', () => {
    const validHeads = ['', 'architecture', 'lifecycle', 'retrieval', 'roadmap', 'stage', 'data', 'security', 'evaluation', 'decisions', 'plan']
    for (const d of SEARCH_INDEX) {
      const path = d.to.replace(/^#/, '')
      const head = path.split('/')[1] ?? ''
      expect(validHeads, `route ${d.to}`).toContain(head)
    }
  })
})

describe('architecture content', () => {
  it('every diagram node has a summary and stage', () => {
    for (const view of ARCH_VIEWS) {
      for (const node of view.nodes) {
        expect(node.summary.length, `${view.id}/${node.id} summary`).toBeGreaterThan(20)
        expect(node.stage.length).toBeGreaterThan(1)
      }
    }
  })

  it('all srcRef chips across the whole site resolve to real plan heading ids', () => {
    const ids = new Set(headings.map((h) => h.id))
    const collected: Array<{ id: string; where: string }> = []
    const walk = (value: unknown, where: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => walk(v, `${where}[${i}]`))
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        if (typeof obj.id === 'string' && typeof obj.label === 'string' && (where.endsWith('srcRef') || Array.isArray(obj))) {
          // objects shaped {id,label} attached as source refs
        }
        if (obj.srcRef && typeof obj.srcRef === 'object') {
          collected.push({ id: (obj.srcRef as { id: string }).id, where })
        }
        for (const [k, v] of Object.entries(obj)) walk(v, `${where}.${k}`)
      }
    }
    const modules = { SUCCESS_METRICS, STAGES, KEY_DECISIONS, OPEN_QUESTIONS, ARCH_VIEWS }
    for (const [name, mod] of Object.entries(modules)) walk(mod, name)
    expect(collected.length).toBeGreaterThan(40)
    for (const c of collected) {
      if (!c.id) continue
      expect(ids.has(c.id), `missing heading ${c.id} (${c.where})`).toBe(true)
    }
  })

  it('every diagram node srcRef resolves', () => {
    const ids = new Set(headings.map((h) => h.id))
    for (const view of ARCH_VIEWS) {
      for (const node of view.nodes) {
        expect(ids.has(node.srcRef.id), `missing heading for ${node.id}: ${node.srcRef.id}`).toBe(true)
      }
    }
  })
})

describe('no fabricated results', () => {
  const MEASURED_MARKERS = [/measured result/i, /\bpass rate\b/i, /\bship status\b/i, /verified at \d+%/, /\bcurrent score\b/i]

  it('success metrics are targets/requirements, never measurements', () => {
    const allowed = ['initial-target', 'hard-requirement', 'invariant', 'proposed-target']
    for (const m of SUCCESS_METRICS) {
      expect(allowed, m.label).toContain(m.status)
      expect(m.srcRef.id).not.toBe('')
    }
  })

  it('plan-quoted research figures keep provenance labels', () => {
    // 98.7% PageIndex is vendor-reported in §2 — the site may quote it only
    // with provenance; check the raw plan quote context exists verbatim.
    expect(planRaw).toMatch(/vendor-reported/i)
  })

  it('no site data claims measured/verified outcomes', () => {
    const corpus = JSON.stringify({ SUCCESS_METRICS, STAGES, KEY_DECISIONS, OPEN_QUESTIONS, RISK_REGISTER, ARCH_VIEWS })
    for (const re of MEASURED_MARKERS) {
      expect(corpus, `marker ${re}`).not.toMatch(re)
    }
  })
})
