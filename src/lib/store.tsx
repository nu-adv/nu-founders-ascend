import { createContext, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EMPTY_FILTERS, applyQuery, buildSearchIndex, type Filters, type Sort } from './query'
import { usePersistentState } from './prefs'
import { DEFAULT_LIST_COLUMNS } from './columns'
import type { Category, Decision, Decisions, Founder, FoundersData } from './types'
import { loadLogos } from './vault'

export type View = 'overview' | 'founders'
export type GroupBy = 'status' | 'source' | 'tier' | 'none'
export type Density = 'comfortable' | 'compact'
export type CategoryRoute = Category | 'all'

interface Route {
  view: View
  category: CategoryRoute
  openId: string | null
}

const CATS: CategoryRoute[] = ['all', 'in_ascend', 'review', 'not_found']

function parseHash(): Route {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'founders') {
    const category = (CATS.includes(parts[1] as CategoryRoute) ? parts[1] : 'all') as CategoryRoute
    return { view: 'founders', category, openId: parts[2] ?? null }
  }
  return { view: 'overview', category: 'all', openId: null }
}

function toHash(r: Route) {
  return r.view === 'overview' ? '#/overview' : `#/founders/${r.category}${r.openId ? `/${r.openId}` : ''}`
}

interface Store {
  founders: Founder[]
  generated: string
  byId: Map<string, Founder>
  counts: Record<CategoryRoute, number>
  route: Route
  go: (view: View, category?: CategoryRoute) => void
  open: (id: string | null) => void
  rows: Founder[]
  base: Founder[]
  search: string
  setSearch: (s: string) => void
  filters: Filters
  setFilters: (f: Filters) => void
  resetFilters: () => void
  sort: Sort
  setSort: (s: Sort | ((p: Sort) => Sort)) => void
  groupBy: GroupBy
  setGroupBy: (g: GroupBy) => void
  listColumns: string[]
  setListColumns: (c: string[]) => void
  decisions: Decisions
  setDecision: (id: string, d: Decision | null) => void
  selected: Set<string>
  setSelected: (s: Set<string> | ((p: Set<string>) => Set<string>)) => void
  activeId: string | null
  setActiveId: (id: string | null) => void
  ui: { exportOpen: boolean; commandOpen: boolean; shortcutsOpen: boolean; navOpen: boolean }
  /** Company logos + founder photos (data URIs), loaded after unlock */
  media: Record<string, string>
  density: Density
  setDensity: (d: Density) => void
  setUi: (patch: Partial<Store['ui']>) => void
  lock: () => void
}

const Ctx = createContext<Store | null>(null)

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function StoreProvider({ data, onLock, children }: { data: FoundersData; onLock: () => void; children: ReactNode }) {
  const founders = data.founders
  const [route, setRoute] = useState<Route>(parseHash)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [storedFilters, setStoredFilters] = usePersistentState<Filters>('filters.v2', EMPTY_FILTERS)
  const [sort, setSort] = usePersistentState<Sort>('sort.v2', { column: 'name', dir: 'asc' })
  const [groupBy, setGroupBy] = usePersistentState<GroupBy>('groupBy.v1', 'status')
  const [listColumns, setListColumns] = usePersistentState<string[]>('columns.v4', DEFAULT_LIST_COLUMNS)
  const [decisions, setDecisions] = usePersistentState<Decisions>('decisions.v1', {})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [media, setMedia] = useState<Record<string, string>>({})
  const [density, setDensity] = usePersistentState<Density>('density.v1', 'comfortable')
  useEffect(() => {
    let live = true
    loadLogos().then((m) => live && setMedia(m))
    return () => {
      live = false
    }
  }, [])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ui, setUiState] = useState({ exportOpen: false, commandOpen: false, shortcutsOpen: false, navOpen: false })
  const routeRef = useRef(route)
  useEffect(() => {
    routeRef.current = route
  }, [route])

  // hash routing (back/forward + shareable links)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    if (!window.location.hash) window.history.replaceState(null, '', toHash(route))
    return () => window.removeEventListener('hashchange', on)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((r: Route, replace = false) => {
    const h = toHash(r)
    if (window.location.hash !== h) {
      if (replace) window.history.replaceState(null, '', h)
      else window.history.pushState(null, '', h)
    }
    setRoute(r)
  }, [])

  const go = useCallback(
    (view: View, category: CategoryRoute = 'all') => navigate({ view, category, openId: null }),
    [navigate],
  )
  const open = useCallback(
    (id: string | null) => {
      const r = routeRef.current
      navigate({ view: 'founders', category: r.view === 'founders' ? r.category : 'all', openId: id }, true)
      if (id) setActiveId(id)
    },
    [navigate],
  )

  const filters = useMemo<Filters>(() => ({ ...storedFilters, category: route.category }), [storedFilters, route.category])
  const setFilters = useCallback((f: Filters) => setStoredFilters({ ...f, category: 'all' }), [setStoredFilters])
  const resetFilters = useCallback(() => {
    setStoredFilters(EMPTY_FILTERS)
    setSearch('')
  }, [setStoredFilters])

  const index = useMemo(() => buildSearchIndex(founders), [founders])
  const byId = useMemo(() => new Map(founders.map((f) => [f.id, f])), [founders])
  const counts = useMemo(() => {
    const c: Record<CategoryRoute, number> = { all: founders.length, in_ascend: 0, review: 0, not_found: 0 }
    for (const f of founders) c[f.category]++
    return c
  }, [founders])
  const base = useMemo(
    () => (route.category === 'all' ? founders : founders.filter((f) => f.category === route.category)),
    [founders, route.category],
  )
  const rows = useMemo(
    () => applyQuery(founders, index, deferredSearch, filters, decisions, sort),
    [founders, index, deferredSearch, filters, decisions, sort],
  )

  const setDecision = useCallback(
    (id: string, d: Decision | null) =>
      setDecisions((prev) => {
        const next = { ...prev }
        if (d) next[id] = d
        else delete next[id]
        return next
      }),
    [setDecisions],
  )

  const setUi = useCallback((patch: Partial<Store['ui']>) => setUiState((u) => ({ ...u, ...patch })), [])

  const value: Store = {
    founders,
    generated: data.generated,
    byId,
    counts,
    route,
    go,
    open,
    rows,
    base,
    search,
    setSearch,
    filters,
    setFilters,
    resetFilters,
    sort,
    setSort,
    groupBy,
    setGroupBy,
    listColumns,
    setListColumns,
    decisions,
    setDecision,
    selected,
    setSelected,
    activeId,
    setActiveId,
    ui,
    setUi,
    media,
    density,
    setDensity,
    lock: onLock,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
