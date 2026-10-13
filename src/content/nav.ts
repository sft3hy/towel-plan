export interface NavItem {
  to: string
  label: string
  hint?: string
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/** Sidebar groups. Top nav shows a condensed set of the same routes. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'start',
    label: 'Start here',
    items: [
      { to: '/', label: 'Overview', hint: 'What Towel is and how success is measured' },
    ],
  },
  {
    id: 'architecture',
    label: 'Architecture',
    items: [
      { to: '/architecture', label: 'System explorer', hint: 'Five interactive layers' },
      { to: '/lifecycle', label: 'Agentic lifecycle', hint: 'The toolbox loop, budgets, stopping' },
      { to: '/retrieval', label: 'Search & indexing', hint: 'The layered retrieval stack' },
      { to: '/data', label: 'Data model & profiles', hint: 'Entities, locators, YAML onboarding' },
      { to: '/security', label: 'Security & isolation', hint: 'Enforced before retrieval' },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    items: [
      { to: '/roadmap', label: 'Implementation roadmap', hint: 'Stages 0–15, gates, parallel work' },
      { to: '/evaluation', label: 'Evaluation & acceptance', hint: 'Scorecards of targets' },
      { to: '/decisions', label: 'Decision record', hint: 'Choices, trade-offs, deferrals' },
    ],
  },
  {
    id: 'plan',
    label: 'Reference',
    items: [{ to: '/plan', label: 'Full plan', hint: 'The complete implementation plan' }],
  },
]

export const TOP_NAV: NavItem[] = [
  { to: '/', label: 'Overview' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/lifecycle', label: 'Lifecycle' },
  { to: '/retrieval', label: 'Retrieval' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/data', label: 'Data' },
  { to: '/security', label: 'Security' },
  { to: '/evaluation', label: 'Evals' },
  { to: '/decisions', label: 'Decisions' },
  { to: '/plan', label: 'Full plan' },
]

export function routeTitle(segments: string[]): string {
  const head = segments[0] ?? ''
  switch (head) {
    case '':
      return 'Overview'
    case 'architecture':
      return 'Architecture explorer'
    case 'lifecycle':
      return 'Agentic retrieval lifecycle'
    case 'retrieval':
      return 'Search & indexing'
    case 'roadmap':
      return 'Implementation roadmap'
    case 'stage':
      return `Stage detail`
    case 'data':
      return 'Data model & profiles'
    case 'security':
      return 'Security & isolation'
    case 'evaluation':
      return 'Evaluation & acceptance'
    case 'decisions':
      return 'Technical decision record'
    case 'plan':
      return 'Full plan reference'
    default:
      return 'Not found'
  }
}

export function setDocumentTitle(segments: string[]) {
  const t = routeTitle(segments)
  document.title = t === 'Overview' ? 'Towel — Super RAG Architecture Explorer' : `${t} · Towel`
}
