import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArchView, CanvasPos } from '../../content/architecture'

/**
 * DiagramCanvas — a shared interactive diagram surface.
 *
 * Desktop: absolutely-positioned, selectable node cards over an SVG edge
 * layer, scaled with a CSS transform so nothing overflows narrow columns.
 *  - Nodes are <button>s: Tab-navigable, Enter/Space selects, edges carry
 *    direction with arrowheads, and every node has a text alternative via
 *    the SVG <title>.
 *  - Below `stackBelowPx` (or when the scale would make labels illegible)
 *    the same data renders as a readable stacked list — no shrunken text.
 */

interface Props {
  view: ArchView
  selectedId?: string | null
  onSelect?: (id: string) => void
  stackBelowPx?: number
  ariaLabel?: string
}

interface Pt {
  x: number
  y: number
}

function anchor(pos: CanvasPos, side: 'top' | 'bottom' | 'left' | 'right'): Pt {
  switch (side) {
    case 'top':
      return { x: pos.x + pos.w / 2, y: pos.y }
    case 'bottom':
      return { x: pos.x + pos.w / 2, y: pos.y + pos.h }
    case 'left':
      return { x: pos.x, y: pos.y + pos.h / 2 }
    case 'right':
      return { x: pos.x + pos.w, y: pos.y + pos.h / 2 }
  }
}

function edgePath(a: CanvasPos, b: CanvasPos): { d: string; mid: Pt; dash: string } {
  const ac: Pt = { x: a.x + a.w / 2, y: a.y + a.h / 2 }
  const bc: Pt = { x: b.x + b.w / 2, y: b.y + b.h / 2 }
  const dx = bc.x - ac.x
  const dy = bc.y - ac.y

  let sa: 'top' | 'bottom' | 'left' | 'right'
  let sb: 'top' | 'bottom' | 'left' | 'right'
  if (Math.abs(dx) > Math.max(a.w, b.w) * 0.6) {
    sa = dx > 0 ? 'right' : 'left'
    sb = dx > 0 ? 'left' : 'right'
  } else if (Math.abs(dy) > Math.max(a.h, b.h) * 0.6) {
    sa = dy > 0 ? 'bottom' : 'top'
    sb = dy > 0 ? 'top' : 'bottom'
  } else {
    sa = dx > 0 ? 'right' : 'left'
    sb = dx > 0 ? 'left' : 'right'
  }
  const p1 = anchor(a, sa)
  const p2 = anchor(b, sb)

  const horizontal = sa === 'left' || sa === 'right'
  let d: string
  if (horizontal) {
    const off = Math.max(28, Math.abs(p2.x - p1.x) * 0.4)
    d = `M ${p1.x} ${p1.y} C ${p1.x + (sa === 'right' ? off : -off)} ${p1.y}, ${p2.x + (sb === 'left' ? -off : off)} ${p2.y}, ${p2.x} ${p2.y}`
  } else {
    const off = Math.max(24, Math.abs(p2.y - p1.y) * 0.45)
    d = `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + (sa === 'bottom' ? off : -off)}, ${p2.x} ${p2.y + (sb === 'top' ? -off : off)}, ${p2.x} ${p2.y}`
  }
  return { d, mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, dash: 'none' }
}

export function DiagramCanvas({ view, selectedId, onSelect, stackBelowPx = 700, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [stacked, setStacked] = useState(false)

  const measure = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const w = el.clientWidth
    if (w < stackBelowPx) {
      setStacked(true)
    } else {
      setStacked(false)
      setScale(Math.min(1, w / view.width))
    }
  }, [view.width, stackBelowPx])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [measure])

  const edges = view.edges
    .map((e) => {
      const a = view.positions[e.from]
      const b = view.positions[e.to]
      if (!a || !b) return null
      const { d, mid } = edgePath(a, b)
      return { e, d, mid }
    })
    .filter(Boolean) as Array<{ e: ArchView['edges'][number]; d: string; mid: Pt }>

  if (stacked) {
    const sorted = [...view.nodes].sort((n1, n2) => {
      const p = view.positions[n1.id]
      const q = view.positions[n2.id]
      return p && q ? p.y - q.y || p.x - q.x : 0
    })
    return (
      <div className="dcanvas dcanvas--stacked" role="list" aria-label={ariaLabel ?? `${view.title}, compact view`}>
        {sorted.map((node) => {
          const outs = view.edges.filter((ed) => ed.from === node.id)
          return (
            <button
              key={node.id}
              type="button"
              role="listitem"
              className={`dnode dnode--${node.topic}${selectedId === node.id ? ' is-selected' : ''}`}
              onClick={() => onSelect?.(node.id)}
              aria-pressed={onSelect ? selectedId === node.id : undefined}
            >
              <span className="dnode__label">{node.label}</span>
              {node.sub ? <span className="dnode__sub">{node.sub}</span> : null}
              {outs.length ? (
                <span className="dnode__outs">
                  {outs.map((ed) => (
                    <span key={ed.to} className="dnode__out">
                      → {view.nodes.find((n) => n.id === ed.to)?.label ?? ed.to}
                      {ed.label ? ` · ${ed.label}` : ''}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="dcanvas" ref={wrapRef}>
      <div
        className="dcanvas__scaled"
        style={{ width: view.width, height: view.height, transform: `scale(${scale})` }}
        role="group"
        aria-label={ariaLabel ?? view.title}
      >
        <svg className="dcanvas__edges" width={view.width} height={view.height} aria-hidden="true">
          <defs>
            <marker id="arr-query" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--acc-cyan)" />
            </marker>
            <marker id="arr-write" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--acc-amber)" />
            </marker>
            <marker id="arr-event" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--acc-violet)" />
            </marker>
            <marker id="arr-control" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--edge)" />
            </marker>
          </defs>
          {edges.map(({ e, d }, i) => (
            <path
              key={`${e.from}-${e.to}-${i}`}
              d={d}
              className={`edge edge--${e.kind}${e.dashed ? ' edge--dashed' : ''}`}
              markerEnd={`url(#arr-${e.kind})`}
            />
          ))}
          {edges.map(({ e, mid }, i) =>
            e.label ? (
              <g key={`lbl-${i}`}>
                <rect x={mid.x - e.label.length * 3.2 - 5} y={mid.y - 9} width={e.label.length * 6.4 + 10} height={18} rx={5} className="edge-label-bg" />
                <text x={mid.x} y={mid.y + 4} className="edge-label" textAnchor="middle">
                  {e.label}
                </text>
              </g>
            ) : null,
          )}
        </svg>
        {view.nodes.map((node) => {
          const pos = view.positions[node.id]
          if (!pos) return null
          return (
            <button
              key={node.id}
              type="button"
              className={`dnode dnode--${node.topic}${selectedId === node.id ? ' is-selected' : ''}${node.planned ? ' is-planned' : ''}`}
              style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h }}
              onClick={() => onSelect?.(node.id)}
              aria-pressed={onSelect ? selectedId === node.id : undefined}
              title={node.summary}
            >
              <span className="dnode__label">{node.label}</span>
              {node.sub ? <span className="dnode__sub">{node.sub}</span> : null}
              <svg width="0" height="0" aria-hidden="true" focusable="false">
                <title>{`${node.label}: ${node.summary}`}</title>
              </svg>
            </button>
          )
        })}
      </div>
      <div className="dcanvas__spacer" style={{ height: view.height * scale }} aria-hidden="true" />
    </div>
  )
}

export function DiagramLegend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="dlegend" role="note" aria-label="Diagram legend">
      {items.map((it) => (
        <span key={it.label} className="dlegend__item">
          <i style={{ background: it.color }} aria-hidden="true" />
          {it.label}
        </span>
      ))}
    </div>
  )
}
