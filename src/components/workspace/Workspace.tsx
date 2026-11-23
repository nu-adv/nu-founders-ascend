import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Columns3,
  Download,
  Keyboard,
  ListFilter,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL, COLUMNS, COLUMN_BY_ID, DEFAULT_LIST_COLUMNS } from '@/lib/columns'
import { EMPTY_FILTERS, activeFilterCount, applyQuery, buildSearchIndex, type Filters, type Sort } from '@/lib/query'
import { usePersistentState } from '@/lib/prefs'
import type { Category, Decision, Decisions, Founder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ExportDialog } from '@/components/ExportDialog'
import { FounderList } from './FounderList'
import { DetailPanel } from './DetailPanel'
import { FilterPanel } from './FilterPanel'
import { ShortcutsDialog } from './ShortcutsDialog'
import { Kbd, Monogram } from './bits'

function useMedia(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

const CATS: (Category | 'all')[] = ['all', 'in_ascend', 'review', 'not_found']

export function Workspace({ founders, generated, onLogout }: { founders: Founder[]; generated: string; onLogout: () => void }) {
  const isDesktop = useMedia('(min-width: 1024px)')
  const isWide = useMedia('(min-width: 1280px)')
  const compact = !useMedia('(min-width: 768px)')

  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filters, setFilters] = usePersistentState<Filters>('filters.v1', EMPTY_FILTERS)
  const [sort, setSort] = usePersistentState<Sort>('sort.v1', { column: 'status', dir: 'asc' })
  const [listCols, setListCols] = usePersistentState<string[]>('columns.v1', DEFAULT_LIST_COLUMNS)
  const [decisions, setDecisions] = usePersistentState<Decisions>('decisions.v1', {})
  const [sidebarOpen, setSidebarOpen] = usePersistentState<boolean>('sidebar.v1', true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [mobileFilters, setMobileFilters] = useState(false)
  const lastClicked = useRef<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const index = useMemo(() => buildSearchIndex(founders), [founders])
  const byId = useMemo(() => new Map(founders.map((f) => [f.id, f])), [founders])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: founders.length, in_ascend: 0, review: 0, not_found: 0 }
    for (const f of founders) c[f.category]++
    return c
  }, [founders])
  const base = useMemo(
    () => (filters.category === 'all' ? founders : founders.filter((f) => f.category === filters.category)),
    [founders, filters.category],
  )
  const rows = useMemo(
    () => applyQuery(founders, index, deferredSearch, filters, decisions, sort),
    [founders, index, deferredSearch, filters, decisions, sort],
  )
  const columns = useMemo(
    () => ['name', ...listCols.filter((id) => id !== 'name')].map((id) => COLUMN_BY_ID[id]).filter((c) => c?.inList),
    [listCols],
  )
  const open = openId ? byId.get(openId) ?? null : null
  const openIndex = open ? rows.findIndex((r) => r.id === open.id) : -1

  const step = useCallback(
    (delta: number) => {
      if (!rows.length) return
      const cur = rows.findIndex((r) => r.id === (openId ?? activeId))
      const next = rows[Math.max(0, Math.min(rows.length - 1, cur < 0 ? 0 : cur + delta))]
      setActiveId(next.id)
      if (openId) setOpenId(next.id)
    },
    [rows, openId, activeId],
  )

  const toggleSelect = useCallback(
    (id: string, shift: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (shift && lastClicked.current) {
          const a = rows.findIndex((r) => r.id === lastClicked.current)
          const b = rows.findIndex((r) => r.id === id)
          if (a >= 0 && b >= 0) {
            const on = !prev.has(id)
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
              if (on) next.add(rows[i].id)
              else next.delete(rows[i].id)
            }
            lastClicked.current = id
            return next
          }
        }
        if (next.has(id)) next.delete(id)
        else next.add(id)
        lastClicked.current = id
        return next
      })
    },
    [rows],
  )

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const all = rows.every((r) => prev.has(r.id))
      const next = new Set(prev)
      for (const r of rows) {
        if (all) next.delete(r.id)
        else next.add(r.id)
      }
      return next
    })
  }, [rows])

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

  const clearAll = () => {
    setSearch('')
    setFilters({ ...EMPTY_FILTERS, category: filters.category })
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable
      if (e.key === 'Escape') {
        if (typing && t === searchRef.current) {
          if (search) setSearch('')
          else searchRef.current?.blur()
          return
        }
        if (openId && !exportOpen && !shortcutsOpen) setOpenId(null)
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || exportOpen || shortcutsOpen) return
      switch (e.key) {
        case '/':
          e.preventDefault()
          searchRef.current?.focus()
          break
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          step(1)
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          step(-1)
          break
        case 'Enter':
          if (activeId) setOpenId(activeId)
          break
        case 'x':
          if (activeId) toggleSelect(activeId, e.shiftKey)
          break
        case 'e':
          setExportOpen(true)
          break
        case 'f':
          if (isDesktop) setSidebarOpen((v) => !v)
          else setMobileFilters(true)
          break
        case '1':
        case '2':
        case '3':
        case '4':
          setFilters({ ...filters, category: CATS[Number(e.key) - 1] })
          break
        case '?':
          setShortcutsOpen(true)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [search, openId, activeId, exportOpen, shortcutsOpen, step, toggleSelect, isDesktop, filters, setFilters, setSidebarOpen])

  const nFilters = activeFilterCount(filters)
  const selectedRows = useMemo(() => founders.filter((f) => selected.has(f.id)), [founders, selected])

  const detail = open && (
    <DetailPanel
      founder={open}
      decision={decisions[open.id]}
      onDecision={setDecision}
      onClose={() => setOpenId(null)}
      onPrev={openIndex > 0 ? () => step(-1) : undefined}
      onNext={openIndex >= 0 && openIndex < rows.length - 1 ? () => step(1) : undefined}
      position={openIndex >= 0 ? { index: openIndex, total: rows.length } : undefined}
    />
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* top bar */}
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
        <div className="flex items-center gap-2.5">
          <Monogram />
          <div className="hidden leading-tight sm:block">
            <div className="font-heading text-[1.05rem] font-medium tracking-[-0.01em]">
              Founders <span className="text-muted-foreground italic">×</span> ascend
            </div>
            <div className="text-[0.68rem] tracking-wide text-muted-foreground">
              Advancement Research · data as of {generated}
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, ascend ID…"
            className="h-9 rounded-lg bg-muted/50 pr-16 pl-9"
            aria-label="Search founders"
          />
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button className="hidden sm:inline-flex" size="sm" onClick={() => setExportOpen(true)}>
            <Download /> Export
          </Button>
          <Button className="sm:hidden" size="icon-sm" onClick={() => setExportOpen(true)} aria-label="Export">
            <Download />
          </Button>
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
                <Keyboard className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Shortcuts <Kbd className="ml-1">?</Kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Lock">
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lock</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* category tabs + overview */}
      <div className="shrink-0 border-b">
        <div className="flex items-center gap-2 overflow-x-auto px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => (isDesktop ? setSidebarOpen(!sidebarOpen) : setMobileFilters(true))}
            aria-label="Toggle filters"
            className="relative shrink-0"
          >
            {isDesktop ? sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen /> : <ListFilter />}
            {nFilters > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground">
                {nFilters}
              </span>
            )}
          </Button>
          <nav className="flex items-center" role="tablist" aria-label="Category">
            {CATS.map((c, i) => {
              const on = filters.category === c
              return (
                <button
                  key={c}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilters({ ...filters, category: c })}
                  className={cn(
                    'relative flex h-11 shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors',
                    on ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-keyshortcuts={String(i + 1)}
                >
                  {c === 'all' ? 'All founders' : CATEGORY_LABEL[c]}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-px font-mono text-[0.68rem] tabular',
                      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {counts[c]}
                  </span>
                  {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
                </button>
              )
            })}
          </nav>
          <div className="ml-auto hidden shrink-0 items-center gap-3 lg:flex">
            <Coverage counts={counts} />
            <ColumnsMenu value={listCols} onChange={setListCols} />
          </div>
        </div>
      </div>

      {/* selection bar */}
      {selected.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b bg-primary/[0.06] px-4 py-1.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="xs" onClick={() => setExportOpen(true)}>
            <Download /> Export selected
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {isDesktop && sidebarOpen && (
          <aside className="w-64 shrink-0 border-r bg-sidebar xl:w-72">
            <FilterPanel base={base} filters={filters} setFilters={setFilters} decisions={decisions} />
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center justify-between border-b px-4 text-xs text-muted-foreground">
            <span>
              <span className="font-mono text-foreground tabular">{rows.length}</span> of {base.length}
              {filters.category === 'all' ? ' founders' : ` · ${CATEGORY_LABEL[filters.category]}`}
              {(nFilters > 0 || search) && (
                <button onClick={clearAll} className="ml-2 text-primary hover:underline">
                  clear
                </button>
              )}
            </span>
            <span className="hidden items-center gap-1.5 md:flex">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd> move <Kbd className="ml-1.5">↵</Kbd> open <Kbd className="ml-1.5">X</Kbd> select
            </span>
          </div>
          <FounderList
            rows={rows}
            columns={columns}
            activeId={activeId}
            openId={openId}
            selected={selected}
            decisions={decisions}
            sort={sort}
            compact={compact}
            onActivate={setActiveId}
            onOpen={setOpenId}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onSort={(col) =>
              setSort((s) => (s.column === col ? { column: col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { column: col, dir: 'asc' }))
            }
            onClearFilters={clearAll}
          />
        </main>

        {isDesktop && open && (
          <aside
            key="detail"
            className={cn(
              'shrink-0 border-l bg-card shadow-[-12px_0_32px_-24px_rgb(0_0_0/0.35)] animate-in slide-in-from-right-8 fade-in-0 duration-200',
              isWide ? 'w-[520px]' : 'w-[440px]',
            )}
            aria-label="Founder details"
          >
            {detail}
          </aside>
        )}
      </div>

      {/* mobile: details + filters as sheets */}
      {!isDesktop && (
        <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
          <SheetContent side="right" showCloseButton={false} className="w-full p-0 sm:max-w-lg data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
            <SheetTitle className="sr-only">{open?.name ?? 'Founder'}</SheetTitle>
            <SheetDescription className="sr-only">Founder details</SheetDescription>
            {detail}
          </SheetContent>
        </Sheet>
      )}
      {!isDesktop && (
        <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
          <SheetContent side="left" className="w-[85vw] p-0 data-[side=left]:w-[85vw] data-[side=left]:sm:max-w-sm">
            <SheetTitle className="sr-only">Filters</SheetTitle>
            <SheetDescription className="sr-only">Filter the founder list</SheetDescription>
            <FilterPanel base={base} filters={filters} setFilters={setFilters} decisions={decisions} />
          </SheetContent>
        </Sheet>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        filteredRows={rows}
        selectedRows={selectedRows}
        allRows={founders}
        decisions={decisions}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}

function Coverage({ counts }: { counts: Record<string, number> }) {
  const total = counts.all || 1
  const seg = [
    { k: 'in_ascend', cls: 'bg-success', label: 'In ascend' },
    { k: 'review', cls: 'bg-warning', label: 'Needs review' },
    { k: 'not_found', cls: 'bg-muted-foreground/35', label: 'Not in ascend' },
  ]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex h-1.5 w-36 overflow-hidden rounded-full bg-muted">
            {seg.map((s) => (
              <span key={s.k} className={s.cls} style={{ width: `${(counts[s.k] / total) * 100}%` }} />
            ))}
          </div>
          <span className="font-mono tabular">{Math.round((counts.in_ascend / total) * 100)}% in ascend</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="space-y-0.5">
        {seg.map((s) => (
          <div key={s.k} className="flex items-center gap-2">
            <span className={cn('size-2 rounded-full', s.cls)} /> {s.label}: {counts[s.k]}
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

function ColumnsMenu({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const listable = COLUMNS.filter((c) => c.inList && c.id !== 'name')
  const groups = [...new Set(listable.map((c) => c.group))]
  const toggle = (id: string) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    // keep the canonical column order
    onChange(COLUMNS.map((c) => c.id).filter((cid) => next.includes(cid)))
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
        {groups.map((g, i) => (
          <div key={g}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">{g}</DropdownMenuLabel>
            {listable
              .filter((c) => c.group === g)
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={value.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChange(DEFAULT_LIST_COLUMNS)}>Reset to default</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
