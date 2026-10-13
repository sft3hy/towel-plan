// Copies the authoritative FULL-PLAN.md from the repository root into
// src/content/full-plan.md so Vite can bundle it at build time.
// The website renders the complete plan from this copy — never truncates it.
import { copyFileSync, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'FULL-PLAN.md')
const dest = join(root, 'src', 'content', 'full-plan.md')

if (!existsSync(src)) {
  console.error('sync-plan: FULL-PLAN.md not found at repository root.')
  process.exit(1)
}

copyFileSync(src, dest)
console.log(`sync-plan: copied FULL-PLAN.md (${statSync(dest).size} bytes) -> src/content/full-plan.md`)
