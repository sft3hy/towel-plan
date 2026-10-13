import { useEffect, useRef, useState } from 'react'
import { PHASES, STAGES, type StageMeta } from '../../content/stages'
import { navigate } from '../../lib/router'

/**
 * RoadmapGraph — dependency-true roadmap: a strict chain 0→6, four parallel
 * profile stages 7–10, convergence through 11–13, product 14, optional 15.
 * Edges are the plan's actual `Depends on` relations from §7, not a fake
 * linear sequence. Clicking a stage opens its detail page.
 */

interface NodePos {
  x: number
  y: number
  w: number
  h: number
}

const W = 1040

function layout(): { positions: Record<number, NodePos>; height: number } {
  const positions: Record<number, NodePos> = {}
  const centerX = W / 2
  const chainW = 340
  const chainH = 78
  const gap = 106
  let y = 8
  for (const s of STAGES) {
    if (s.parallelGroup === 'profiles') continue
    positions[s.n] = { x: centerX - chainW / 2, y, w: chainW, h: chainH }
    y += gap
  }
  // Parallel band sits on its own row below Stage 6; later stages shift down.
  const parallelY = 8 + 7 * gap
  const cols = [
    { x: 30, w: 230 },
    { x: 280, w: 230 },
    { x: 530, w: 230 },
    { x: 780, w: 230 },
  ]
  ;[7, 8, 9, 10].forEach((n, i) => {
    positions[n] = { x: cols[i].x, y: parallelY, w: cols[i].w, h: chainH + 4 }
  })
  // Shift stages after the parallel band down to make room.
  const shift = 150
  for (const n of [11, 12, 13, 14, 15]) {
    positions[n].y += shift
  }
  // Widen the 13-vs-6 dashed-edge lane a touch: 13 gets a hint chip.
  return { positions, height: positions[15].y + chainH + 40 }
}

function anchor(pos: NodePos, side: 'top' | 'bottom'): { x: number; y: number } {
  return side === 'top' ? { x: pos.x + pos.w / 2, y: pos.y } : { x: pos.x + pos.w / 2, y: pos.y + pos.h }
}

function edgeD(a: NodePos, b: NodePos, sideA: 'top' | 'bottom', sideB: 'top' | 'bottom'): string {
  const p = anchor(a, sideA)
  const q = anchor(b, sideB)
  const off = Math.max(30, Math.abs(q.y - p.y) * 0.4)
  return `M ${p.x} ${p.y} C ${p.x} ${p.y + (sideA === 'bottom' ? off : -off)}, ${q.x} ${q.y + (sideB === 'top' ? -off : off)}, ${q.x} ${q.y}`
}

export function RoadmapGraph() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [stacked, setStacked] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      if (w < 720) {
        setStacked(true)
      } else {
        setStacked(false)
        setScale(Math.min(1, w / W))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { positions, height } = layout()

  const edges: Array<{ key: string; d: string; dashed?: boolean }> = []
  for (const s of STAGES) {
    for (const dep of s.dependsOn) {
      const a = positions[dep]
      const b = positions[s.n]
      if (!a || !b) continue
      // Stage 13's early-skeleton dependency on Stage 6 is communicated on
      // the stage card itself (dependsLabel) to keep the graph readable;
      // its hard chain dependency flows 11 → 12 → 13.
      if (dep === 6 && s.n === 13) continue
      edges.push({ key: `${dep}-${s.n}`, d: edgeD(a, b, 'bottom', 'top') })
    }
  }

  if (stacked) {
    const ordered = [...STAGES].sort((a, b) => a.n - b.n)
    return (
      <div className="rmgraph rmgraph--stacked" role="group" aria-label="Stage dependency graph">
        {ordered.map((s) => (
          <div key={s.n} className="rmstack-row">
            <button type="button" className={`rmnode rmnode--${s.topic}`} aria-label={`Stage ${s.n}: ${s.name}`} onClick={() => navigate(`/stage/${s.n}`)}>
              <span className="rmnode__num">{s.n}</span>
              <span className="rmnode__body">
                <span className="rmnode__name">{s.name}</span>
                <span className="rmnode__deps">
                  {s.dependsOn.length ? `depends on ${s.dependsOn.join(', ')}` : 'no dependencies'}
                </span>
              </span>
            </button>
          </div>
        ))}
      </div>
    )
  }

  const phaseBands = PHASES.map((ph) => {
    const first = positions[ph.range[0]]
    const last = positions[ph.range[1]]
    if (!first || !last) return null
    const top = Math.min(first.y, ...STAGES.filter((s) => s.phase === ph.id && positions[s.n]).map((s) => positions[s.n].y))
    const bottom = last.y + last.h
    return (
      <div key={ph.id} className={`rmphase rmphase--${ph.id}`} style={{ top: top - 14, height: bottom - top + 28 }}>
        <span className="rmphase__label">{ph.label}</span>
      </div>
    )
  })

  return (
    <div className="rmgraph" ref={wrapRef}>
      <div className="rmgraph__scaled" style={{ width: W, height, transform: `scale(${scale})` }} role="group" aria-label="Stage dependency graph">
        {phaseBands}
        <svg className="rmgraph__edges" width={W} height={height} aria-hidden="true">
          <defs>
            <marker id="rm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge-strong)" />
            </marker>
          </defs>
          {edges.map((e) => (
            <path key={e.key} d={e.d} className={`rmedge${e.dashed ? ' rmedge--dashed' : ''}`} markerEnd="url(#rm-arr)" />
          ))}
        </svg>
        {STAGES.map((s) => {
          const pos = positions[s.n]
          if (!pos) return null
          return (
            <button
              key={s.n}
              type="button"
              className={`rmnode rmnode--${s.topic}`}
              style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
              onClick={() => navigate(`/stage/${s.n}`)}
            >
              <span className="rmnode__num">{s.n}</span>
              <span className="rmnode__body">
                <span className="rmnode__name">{s.name}</span>
                <span className="rmnode__deps">{depsLabel(s)}</span>
              </span>
              {s.parallelGroup ? <span className="rmnode__parallel">parallel</span> : null}
            </button>
          )
        })}
        <GateMark y={positions[6].y + positions[6].h + 26} label="gate-6 · contracts frozen — parallelism opens" />
        <GateMark y={positions[10].y + positions[10].h + 24} label="gates 7–10 · any order" />
        <GateMark y={positions[13].y + positions[13].h + 24} label="gate-13 · baseline scorecard" />
        <HintChip top={positions[13].y + 22} />
      </div>
      <div className="rmgraph__spacer" style={{ height: height * scale }} aria-hidden="true" />
    </div>
  )
}

function depsLabel(s: StageMeta): string {
  if (s.dependsLabel) return s.dependsLabel
  if (!s.dependsOn.length) return 'no dependencies'
  return `depends on Stage ${s.dependsOn.join(', ')}`
}

function GateMark({ y, label }: { y: number; label: string }) {
  return (
    <div className="rmgate" style={{ top: y }}>
      <span className="rmgate__line" aria-hidden="true" />
      <span className="rmgate__label">{label}</span>
      <span className="rmgate__line" aria-hidden="true" />
    </div>
  )
}

function HintChip({ top }: { top: number }) {
  return (
    <span className="rmhint" style={{ position: 'absolute', left: 30, top }}>
      Stage 13’s harness skeleton can start right after Stage 6 so every later stage reports metrics.
    </span>
  )
}
