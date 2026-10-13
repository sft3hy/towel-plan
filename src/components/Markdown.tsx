import { memo, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './ui'

/**
 * Shared markdown renderer for the full plan and stage pages.
 * Headings get stable ids for deep links; code gets copy buttons;
 * internal hash links stay on the client.
 */

function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(textOf).join('')
  if (children && typeof children === 'object' && 'props' in (children as { props?: { children?: ReactNode } })) {
    return textOf((children as { props?: { children?: ReactNode } }).props?.children)
  }
  return ''
}

const anchorClick = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  window.location.hash = `/plan/${id}`
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export const planComponents: Components = {
  h1: ({ children }) => <h1 className="plan-md__h plan-md__h--1">{children}</h1>,
  h2: ({ children }) => {
    const text = textOf(children)
    const id = hashFor(text, '')
    return (
      <h2 id={id || undefined} className="plan-md__h plan-md__h--2" data-md>
        <a className="plan-md__anchor" href={`#/plan/${id}`} onClick={anchorClick(id)} aria-label={`Link to section: ${text}`}>
          {children}
        </a>
      </h2>
    )
  },
  h3: ({ children }) => {
    const text = textOf(children)
    const id = hashFor(text, '')
    return (
      <h3 id={id || undefined} className="plan-md__h plan-md__h--3">
        <a className="plan-md__anchor" href={`#/plan/${id}`} onClick={anchorClick(id)} aria-label={`Link to section: ${text}`}>
          {children}
        </a>
      </h3>
    )
  },
  h4: ({ children }) => <h4 className="plan-md__h plan-md__h--4">{children}</h4>,
  table: ({ children }) => (
    <div className="plan-md__tablewrap">
      <table className="plan-md__table">{children}</table>
    </div>
  ),
  code: ({ className, children }) => {
    const text = String(children).replace(/\n$/, '')
    const lang = /language-(\w+)/.exec(className ?? '')?.[1]
    const multiline = text.includes('\n') || text.length > 60
    if (!multiline) {
      return <code className="plan-md__inline-code">{text}</code>
    }
    return <CodeBlock code={text} lang={lang} />
  },
  pre: ({ children }) => <>{children}</>,
  a: ({ href, children }) => {
    if (href?.startsWith('#')) {
      return (
        <a className="plan-md__link" href={href}>
          {children}
        </a>
      )
    }
    return (
      <a className="plan-md__link" href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },
  blockquote: ({ children }) => <blockquote className="plan-md__quote">{children}</blockquote>,
}

/** Compute the same ids as lib/plan.ts parseHeadings so anchors line up.
 *  Duplicates are resolved by an index maintained by the caller passing a
 *  map; here we accept collisions for inline headings (rare). */
function hashFor(text: string, _suffix: string): string {
  return text
    .replace(/\\([_*\[\]`])/g, '$1')
    .replace(/`/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const PlanMarkdown = memo(function PlanMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="plan-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={planComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
})
