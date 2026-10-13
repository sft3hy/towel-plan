import { lazy, Suspense, useEffect } from 'react'
import { navigate, useRoute, useScrollRestore } from './lib/router'
import { AppShell } from './components/AppShell'
import { OverviewPage } from './pages/OverviewPage'
import { ArchitecturePage } from './pages/ArchitecturePage'
import { LifecyclePage } from './pages/LifecyclePage'
import { RetrievalPage } from './pages/RetrievalPage'
import { RoadmapPage } from './pages/RoadmapPage'
import { StagePage } from './pages/StagePage'
import { DataPage } from './pages/DataPage'
import { SecurityPage } from './pages/SecurityPage'
import { EvaluationPage } from './pages/EvaluationPage'
import { DecisionsPage } from './pages/DecisionsPage'
import { setDocumentTitle } from './content/nav'

// The full plan reader bundles the complete 140 KB document and the
// markdown renderer — lazy-load it so other pages stay lean.
const PlanPage = lazy(() => import('./pages/PlanPage').then((m) => ({ default: m.PlanPage })))

export default function App() {
  const route = useRoute()
  useScrollRestore(route)
  useEffect(() => setDocumentTitle(route.segments), [route.segments])

  const [head, tail] = route.segments
  let page: React.ReactNode
  switch (head) {
    case undefined:
      page = <OverviewPage />
      break
    case 'architecture':
      page = <ArchitecturePage />
      break
    case 'lifecycle':
      page = <LifecyclePage />
      break
    case 'retrieval':
      page = <RetrievalPage />
      break
    case 'roadmap':
      page = <RoadmapPage />
      break
    case 'stage':
      page = tail ? <StagePage id={tail} /> : <RoadmapPage />
      break
    case 'data':
      page = <DataPage />
      break
    case 'security':
      page = <SecurityPage />
      break
    case 'evaluation':
      page = <EvaluationPage />
      break
    case 'decisions':
      page = <DecisionsPage />
      break
    case 'plan':
      page = (
        <Suspense fallback={<div className="canvas-hint" role="status">Loading the full plan…</div>}>
          <PlanPage anchor={tail} />
        </Suspense>
      )
      break
    default:
      page = <NotFound what={route.path} />
  }

  return <AppShell>{page}</AppShell>
}

function NotFound({ what }: { what: string }) {
  return (
    <article className="notfound">
      <p className="notfound__code">404</p>
      <h1>Nothing lives at <code>{what}</code></h1>
      <p>
        The plan has 16 stages (0–15), five architecture views, and one full-text reference. Pick a door:
      </p>
      <div className="notfound__links">
        {[
          ['/', 'Overview'],
          ['/architecture', 'Architecture explorer'],
          ['/roadmap', 'Roadmap'],
          ['/plan', 'Full plan'],
        ].map(([to, label]) => (
          <button key={to} type="button" className="btn" onClick={() => navigate(to)}>
            {label}
          </button>
        ))}
      </div>
    </article>
  )
}
