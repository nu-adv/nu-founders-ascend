import { COLUMN_BY_ID } from './columns'
import type { Category, Decisions, Founder, MatchStatus } from './types'

export type SourceFilter = 'PitchBook' | 'Website' | 'Both'
export type DecisionFilter = 'undecided' | 'match' | 'not_match' | 'unsure'

export interface Filters {
  category: Category | 'all'
  statuses: MatchStatus[]
  sources: SourceFilter[]
  tiers: string[]
  sectors: string[]
  evidence: string[]
  decisions: DecisionFilter[]
  hasEmail: boolean
  hasLinkedin: boolean
  hasHousehold: boolean
}

export const EMPTY_FILTERS: Filters = {
  category: 'all',
  statuses: [],
  sources: [],
  tiers: [],
  sectors: [],
  evidence: [],
  decisions: [],
  hasEmail: false,
  hasLinkedin: false,
  hasHousehold: false,
}

export interface Sort {
  column: string
  dir: 'asc' | 'desc'
}

export function activeFilterCount(f: Filters): number {
  return (
    f.statuses.length +
    f.sources.length +
    f.tiers.length +
    f.sectors.length +
    f.evidence.length +
    f.decisions.length +
    Number(f.hasEmail) +
    Number(f.hasLinkedin) +
    Number(f.hasHousehold)
  )
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Precomputed lowercase text for each founder used by the search box. */
export function buildSearchIndex(founders: Founder[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const f of founders) {
    const parts = [
      f.name,
      ...f.aliases,
      f.title,
      f.company,
      ...f.emails,
      f.location,
      f.sector,
      f.degree,
      f.classOf,
      f.field,
      f.ascend?.constituentId,
      f.ascend?.householdId,
      f.ascend?.name,
      f.ascend?.householdName,
      f.ascend?.employer,
      ...(f.ascend?.emails ?? []),
      ...f.website.map((w) => w.currentCompany),
    ]
    m.set(f.id, norm(parts.filter(Boolean).join(' · ')))
  }
  return m
}

export function sourceKind(f: Founder): SourceFilter {
  if (f.sources.length > 1) return 'Both'
  return f.sources[0] === 'Website' ? 'Website' : 'PitchBook'
}

export function applyQuery(
  founders: Founder[],
  index: Map<string, string>,
  search: string,
  filters: Filters,
  decisions: Decisions,
  sort: Sort,
): Founder[] {
  const terms = norm(search).split(/\s+/).filter(Boolean)
  const out = founders.filter((f) => {
    if (filters.category !== 'all' && f.category !== filters.category) return false
    if (filters.statuses.length && !filters.statuses.includes(f.status)) return false
    if (filters.sources.length && !filters.sources.includes(sourceKind(f))) return false
    if (filters.tiers.length && !filters.tiers.includes(f.tier || 'No tier')) return false
    if (filters.sectors.length && !filters.sectors.includes(f.sector || 'Unknown')) return false
    if (filters.evidence.length && !filters.evidence.some((k) => f.evidence.some((e) => e.kind === k))) return false
    if (filters.decisions.length) {
      const d = decisions[f.id]?.value ?? 'undecided'
      if (!filters.decisions.includes(d)) return false
    }
    if (filters.hasEmail && !f.emails.length) return false
    if (filters.hasLinkedin && !f.linkedin) return false
    if (filters.hasHousehold && !f.ascend?.householdId) return false
    if (terms.length) {
      const hay = index.get(f.id) ?? ''
      if (!terms.every((t) => hay.includes(t))) return false
    }
    return true
  })
  const col = COLUMN_BY_ID[sort.column]
  if (col) {
    const dir = sort.dir === 'asc' ? 1 : -1
    const val = (f: Founder) =>
      sort.column === 'status' ? String(STATUS_ORDER[f.status]) : col.value(f, decisions[f.id]).toLowerCase()
    out.sort((a, b) => {
      const va = val(a)
      const vb = val(b)
      if (!va && vb) return 1 // empties last regardless of direction
      if (va && !vb) return -1
      return va < vb ? -dir : va > vb ? dir : a.last.localeCompare(b.last)
    })
  }
  return out
}

export const STATUS_ORDER: Record<MatchStatus, number> = {
  CONFIRMED: 0,
  PROBABLE: 1,
  AMBIGUOUS: 2,
  POSSIBLE: 3,
  UNVERIFIED: 4,
  'NOT CHECKED': 5,
  'NOT FOUND': 6,
}

/** Distinct values (with counts) for a facet, most common first. */
export function facet(founders: Founder[], get: (f: Founder) => string): { value: string; count: number }[] {
  const m = new Map<string, number>()
  for (const f of founders) {
    const v = get(f)
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  return [...m.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count)
}
