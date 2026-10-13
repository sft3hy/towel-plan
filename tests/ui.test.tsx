import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../src/App'
import { STAGES } from '../src/content/stages'

/**
 * Navigation & interaction tests on the real App tree (jsdom). Diagrams
 * collapse to their stacked variant at zero width in jsdom, which is
 * exactly the mobile behavior we want to assert renders fully.
 */

function renderApp() {
  return render(<App />)
}

function go(hash: string) {
  window.location.hash = hash
  // jsdom fires hashchange asynchronously; flush it explicitly.
  fireEvent(window, new HashChangeEvent('hashchange'))
}

beforeEach(() => {
  window.location.hash = '/'
})

describe('app shell navigation', () => {
  it('renders the overview shell with primary navigation', () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: /primary/i })
    for (const label of ['Overview', 'Architecture', 'Roadmap', 'Full plan']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(document.body).toHaveTextContent(/toolbox of search/i)
  })

  it('navigates to every major page and each renders its heading', async () => {
    renderApp()
    const routes: Array<[string, RegExp]> = [
      ['#/architecture', /five parts/i],
      ['#/lifecycle', /toolbox loop/i],
      ['#/retrieval', /day one/i],
      ['#/roadmap', /stages 0/i],
      ['#/data', /two retrievable levels/i],
      ['#/security', /enforced before retrieval/i],
      ['#/evaluation', /harness/i],
      ['#/decisions', /decision record/i],
    ]
    for (const [hash, pattern] of routes) {
      go(hash)
      await waitFor(() => {
        expect(document.body.textContent).toMatch(pattern)
      }, { timeout: 2000 })
    }
  })

  it('shows a 404 page with recovery links for unknown routes', async () => {
    renderApp()
    go('#/does-not-exist')
    await waitFor(() => {
      expect(document.body).toHaveTextContent(/nothing lives at/i)
    })
    const article = screen.getByRole('article')
    // The recovery doors are buttons inside the 404 article.
    expect(within(article).getByRole('button', { name: /full plan/i })).toBeInTheDocument()
    fireEvent.click(within(article).getByRole('button', { name: /roadmap/i }))
    await waitFor(() => expect(window.location.hash).toBe('#/roadmap'))
  })
})

describe('roadmap page', () => {
  it('lists every stage 0–15 in the stacked dependency view with dependency labels', async () => {
    window.location.hash = '#/roadmap'
    renderApp()
    const graph = await screen.findByRole('group', { name: /stage dependency graph/i })
    for (const s of STAGES) {
      expect(
        within(graph).getByRole('button', { name: new RegExp(`Stage ${s.n}:`, 'i') }),
        `stage ${s.n}`,
      ).toBeInTheDocument()
    }
  })

  it('clicking a stage routes to its detail page', async () => {
    window.location.hash = '#/roadmap'
    renderApp()
    const graph = await screen.findByRole('group', { name: /stage dependency graph/i })
    const stage8 = within(graph).getByRole('button', { name: /Stage 8:/i })
    fireEvent.click(stage8)
    await waitFor(() => {
      expect(window.location.hash).toBe('#/stage/8')
    })
  })
})

describe('stage pages', () => {
  it('renders the full text of a stage, not a summary', async () => {
    window.location.hash = '#/stage/4'
    renderApp()
    await waitFor(() => {
      expect(document.body).toHaveTextContent(/Stage 4/)
    })
    // Full stage cards include their plan-authored sections.
    expect(document.body.textContent).toMatch(/Acceptance tests/)
    expect(document.body.textContent).toMatch(/Pitfalls/)
  })

  it('stage 14 exposes sub-stage navigation 14A–14D', async () => {
    window.location.hash = '#/stage/14'
    renderApp()
    await waitFor(() => expect(document.body).toHaveTextContent(/Stage 14/))
    for (const sub of ['14A', '14B', '14C', '14D']) {
      expect(document.body.textContent).toContain(sub)
    }
  })

  it('stage 15 marks extensions as gated on evidence', async () => {
    window.location.hash = '#/stage/15'
    renderApp()
    await waitFor(() => expect(document.body).toHaveTextContent(/Stage 15/))
    expect(document.body.textContent).toMatch(/visual_doc|evidence/i)
  })
})

describe('search dialog', () => {
  it('opens with ⌘K, finds a tool, and navigates on Enter', async () => {
    renderApp()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    const box = await screen.findByRole('combobox')
    fireEvent.change(box, { target: { value: 'grep' } })
    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
    })
    fireEvent.keyDown(window, { key: 'Enter' })
    await waitFor(() => {
      expect(window.location.hash).toBe('#/stage/4')
    })
  })

  it('searching for a stage routes to that stage', async () => {
    renderApp()
    fireEvent.keyDown(window, { key: '/' })
    const box = await screen.findByRole('combobox')
    fireEvent.change(box, { target: { value: 'stage 8' } })
    const options = await screen.findAllByRole('option')
    const hit = options.find((o) => /Stage 8/.test(o.textContent ?? ''))
    expect(hit).toBeTruthy()
    // The clickable element is the button inside the option.
    fireEvent.click(hit!.querySelector('button') ?? hit!)
    await waitFor(() => expect(window.location.hash).toBe('#/stage/8'))
  })

  it('closes with Escape', async () => {
    renderApp()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    await screen.findByRole('dialog')
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

describe('plan reference page', () => {
  it('renders the table of contents and full text', async () => {
    window.location.hash = '#/plan'
    renderApp()
    // The full 140 KB plan is lazy-loaded and markdown-parsed in jsdom —
    // this is the slowest render in the suite.
    const toc = await screen.findByRole('navigation', { name: /contents|table of contents/i }, { timeout: 20000 })
    expect(within(toc).getByText(/Purpose, scope, and thesis/i)).toBeInTheDocument()
    expect(within(toc).getByText(/Appendix: glossary and sources/i)).toBeInTheDocument()
    // A deep section of the actual plan text is present (not truncated).
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/ECONNRESET|planted_facts|reciprocal rank fusion/i)
    }, { timeout: 20000 })
  }, 30000)
})

describe('security page', () => {
  it('states the DB-before-retrieval rule and shows the RLS predicate', async () => {
    window.location.hash = '#/security'
    renderApp()
    await waitFor(() => expect(document.body).toHaveTextContent(/never in the prompt/i))
    expect(document.body.textContent).toMatch(/current_setting\(['"]towel\.app_id['"]/)
    expect(document.body.textContent).toMatch(/NOBYPASSRLS|zero rows/i)
  })
})
