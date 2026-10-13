import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { createElement } from 'react'

/**
 * Minimal hash-based router — chosen deliberately for GitHub Pages:
 * deep links like #/stage/8 work from any static host under any base
 * path with zero server-side rewrites.
 */

export interface Route {
  /** path segments after '#/', e.g. ['stage','8'] */
  segments: string[]
  /** full hash path, e.g. '/stage/8' */
  path: string
}

function readHash(): Route {
  const raw = window.location.hash.slice(1) || '/'
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const segments = path.split('/').filter(Boolean)
  return { segments, path }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(readHash)
  useEffect(() => {
    const onChange = () => setRoute(readHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(to: string): void {
  const target = to.startsWith('#') ? to.slice(1) : to
  if (window.location.hash.slice(1) === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = target
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  return createElement(
    'a',
    {
      href: `#${to.startsWith('/') ? to : `/${to}`}`,
      onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
      },
      ...rest,
    },
    children,
  )
}

/** Scroll management: top on page change, anchored on plan-section links. */
export function useScrollRestore(route: Route): void {
  useEffect(() => {
    const [first, second] = route.segments
    if (first === 'plan' && second) {
      // Wait for the markdown tree to paint, then scroll to the anchor.
      let tries = 0
      const tick = () => {
        const el = document.getElementById(second)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (tries++ < 10) {
          requestAnimationFrame(tick)
        }
      }
      const raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route.path])
}
