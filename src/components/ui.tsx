import { useState, type ReactNode } from 'react'
import { Check, Copy, GitCommitHorizontal, ExternalLink } from 'lucide-react'

// ---------------------------------------------------------------------------
// StatusLabel — the content-provenance vocabulary used across the site.
// ---------------------------------------------------------------------------

export type StatusKind =
  | 'defined'
  | 'illustrative'
  | 'open-question'
  | 'deferred'
  | 'proposed-target'
  | 'initial-target'
  | 'hard-requirement'
  | 'invariant'
  | 'vendor-reported'
  | 'interpretation'
  | 'day-one'
  | 'flag'
  | 'stage'

const STATUS_TEXT: Record<StatusKind, string> = {
  defined: 'Defined in plan',
  illustrative: 'Illustrative',
  'open-question': 'Open question',
  deferred: 'Deferred',
  'proposed-target': 'Proposed target',
  'initial-target': 'Initial target',
  'hard-requirement': 'Hard requirement',
  invariant: 'Invariant',
  'vendor-reported': 'Vendor-reported',
  interpretation: 'Engineering interpretation',
  'day-one': 'Day one',
  flag: 'Flag-gated',
  stage: 'Staged',
}

export function StatusLabel({ kind, label }: { kind: StatusKind; label?: string }) {
  return (
    <span className={`status status--${kind}`} role="note">
      {label ?? STATUS_TEXT[kind]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SourceReference — a chip linking back to the full plan section.
// ---------------------------------------------------------------------------

export function SourceReference({ id, label }: { id: string; label: string }) {
  if (!id) return null
  return (
    <a className="src-ref" href={`#/plan/${id}`} title={`Read this in the full plan: ${label}`}>
      <GitCommitHorizontal size={13} aria-hidden="true" />
      <span>{label}</span>
    </a>
  )
}

export function SourceRefs({ refs }: { refs: Array<{ id: string; label: string }> }) {
  if (!refs.length) return null
  return (
    <span className="src-refs">
      {refs.map((r) => (
        <SourceReference key={r.id + r.label} id={r.id} label={r.label} />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Callout
// ---------------------------------------------------------------------------

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'ok' | 'defer' | 'threat'
  title?: string
  children: ReactNode
}) {
  return (
    <aside className={`callout callout--${tone}`}>
      {title ? <p className="callout__title">{title}</p> : null}
      <div className="callout__body">{children}</div>
    </aside>
  )
}

// ---------------------------------------------------------------------------
// Section heading with anchor
// ---------------------------------------------------------------------------

export function SectionHeading({
  id,
  kicker,
  children,
  level = 2,
}: {
  id: string
  kicker?: string
  children: ReactNode
  level?: 2 | 3
}) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <H id={id} className={`sec-h sec-h--${level}`} data-anchor={id}>
      {kicker ? <span className="sec-h__kicker">{kicker}</span> : null}
      <span className="sec-h__text">{children}</span>
      <a className="sec-h__anchor" href={`#${window.location.hash.slice(1)}`} aria-label="Link to this section" onClick={(e) => {
        e.preventDefault()
        const el = document.getElementById(id)
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        navigator.clipboard?.writeText(window.location.href.split('#')[0] + '#' + window.location.hash).catch(() => {})
      }}>
        #
      </a>
    </H>
  )
}

// ---------------------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------------------

export function PageHeader({
  eyebrow,
  title,
  lead,
  chips,
}: {
  eyebrow: string
  title: string
  lead: ReactNode
  chips?: ReactNode
}) {
  return (
    <header className="page-head">
      <p className="page-head__eyebrow">{eyebrow}</p>
      <h1 className="page-head__title">{title}</h1>
      <p className="page-head__lead">{lead}</p>
      {chips ? <div className="page-head__chips">{chips}</div> : null}
    </header>
  )
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

export function MetricCard({
  value,
  label,
  detail,
  status,
  stage,
  srcRef,
}: {
  value: string
  label: string
  detail: string
  status: 'initial-target' | 'hard-requirement' | 'invariant' | 'proposed-target'
  stage?: string
  srcRef?: { id: string; label: string }
}) {
  return (
    <article className={`metric metric--${status}`}>
      <div className="metric__top">
        <StatusLabel kind={status} />
        {stage ? <span className="metric__stage">{stage}</span> : null}
      </div>
      <p className="metric__value">{value}</p>
      <h3 className="metric__label">{label}</h3>
      <p className="metric__detail">{detail}</p>
      {srcRef ? <SourceReference id={srcRef.id} label={srcRef.label} /> : null}
    </article>
  )
}

// ---------------------------------------------------------------------------
// CodeBlock with copy
// ---------------------------------------------------------------------------

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable (permissions/insecure context) — ignore.
    }
  }
  return (
    <div className="codeblock" data-lang={lang ?? 'text'}>
      <div className="codeblock__bar">
        <span className="codeblock__lang">{lang ?? 'text'}</span>
        <button type="button" className="codeblock__copy" onClick={copy} aria-label="Copy code to clipboard">
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// External link chip
// ---------------------------------------------------------------------------

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="ext-link">
      {children} <ExternalLink size={11} aria-hidden="true" />
    </a>
  )
}
