import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

/**
 * Static-hosting contract: the built bundle must work from any base path
 * (GitHub Pages project sites live under /<repo>/). Assets referenced with
 * absolute "/" paths break there — everything must be relative, and routing
 * must stay on the hash so no server rewrites are needed.
 */

const dist = join(__dirname, '..', 'dist')

function ensureBuilt(): void {
  if (!existsSync(join(dist, 'index.html'))) {
    execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'pipe', timeout: 300_000 })
  }
}

describe('production bundle works under a non-root base path', () => {
  it('index.html references assets relatively (./assets/…)', () => {
    ensureBuilt()
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    expect(html).toMatch(/(?:src|href)="\.\//)
    // No absolute-root references anywhere in the entry document.
    expect(html).not.toMatch(/(?:src|href)="\/(?!\/)/)
  })

  it('all bundled chunk files exist on disk', () => {
    ensureBuilt()
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    const refs = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1])
    expect(refs.length).toBeGreaterThan(1)
    for (const ref of refs) {
      expect(existsSync(join(dist, ref)), `missing ${ref}`).toBe(true)
    }
  })

  it('no absolute-path asset URLs leaked into JS chunks', () => {
    ensureBuilt()
    const assetsDir = join(dist, 'assets')
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    const jsRefs = [...html.matchAll(/src="\.\/assets\/([^"]+\.js)"/g)].map((m) => m[1])
    for (const ref of jsRefs) {
      const code = readFileSync(join(assetsDir, ref), 'utf8')
      // Dynamic import chunks are emitted as "./..." too; flag only "/assets/
      expect(code, `chunk ${ref} hardcodes /assets/`).not.toMatch(/["'`]\/assets\//)
    }
  })

  it('routing is hash-based so static hosts need no rewrites', () => {
    const src = readFileSync(join(__dirname, '..', 'src', 'lib', 'router.tsx'), 'utf8')
    expect(src).toContain('hashchange')
    expect(src).toContain('location.hash')
  })

  it('deploy workflow pins actions to v4+ tags and fails the publish on a broken build', () => {
    const wfPath = join(__dirname, '..', '.github', 'workflows', 'deploy.yml')
    expect(existsSync(wfPath), 'GitHub Pages workflow missing').toBe(true)
    const wf = readFileSync(wfPath, 'utf8')
    expect(wf).toMatch(/actions\/checkout@v\d+/)
    expect(wf).toMatch(/actions\/setup-node@v\d+/)
    expect(wf).toMatch(/actions\/upload-pages-artifact@v\d+|actions\/upload-artifact@v\d+/)
    expect(wf).toMatch(/deploy-pages@v\d+/)
    // set -e semantics: npm run build failing must abort the job.
    expect(wf).toMatch(/npm (ci|install)/)
    expect(wf).toMatch(/npm run build/)
  })
})
