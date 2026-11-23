import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_LABEL } from '@/lib/columns'
import { usePersistentState } from '@/lib/prefs'
import { useStore, type CategoryRoute } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Kbd, PanelHeader, Segmented } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { panelIn, springSoft } from '@/components/kit/motion'
import { GroupedList, visualOrder } from './GroupedList'
import { ActiveFilters, FilterMenu } from './FilterMenu'
import { DisplayMenu } from './DisplayMenu'
import { DetailPanel } from './DetailPanel'

const CAT_ICON = {
  all: null,
  in_ascend: 'CONFIRMED',
  review: 'PROBABLE',
  not_found: 'NOT FOUND',
} as const

export function FoundersView({ isDesktop, compact }: { isDesktop: boolean; compact: boolean }) {
  const s = useStore()
  const { route, rows, base, search, setSearch, groupBy, byId, open, activeId, setActiveId, selected, setSelected, ui, setUi, go } = s
  const [collapsedArr, setCollapsedArr] = usePersistentState<string[]>('collapsed.v1', [])
  const collapsed = useMemo(() => new Set(collapsedArr), [collapsedArr])
  const order = useMemo(() => visualOrder(rows, groupBy, collapsed), [rows, groupBy, collapsed])
  const searchRef = useRef<HTMLInputElement>(null)

  const openFounder = route.openId ? byId.get(route.openId) ?? null : null
  const openIndex = openFounder ? order.findIndex((r) => r.id === openFounder.id) : -1

  const step = (delta: number) => {
    if (!order.length) return
    const cur = order.findIndex((r) => r.id === (route.openId ?? activeId))
    const next = order[Math.max(0, Math.min(order.length - 1, cur < 0 ? 0 : cur + delta))]
    setActiveId(next.id)
    if (route.openId) open(next.id)
  }

  // list-level keyboard: J/K, arrows, Enter, X, Esc, /
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ui.exportOpen || ui.commandOpen || ui.shortcutsOpen) return
      const t = e.target as HTMLElement
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable
      if (e.key === 'Escape') {
        if (t === searchRef.current) {
          if (search) setSearch('')
          else searchRef.current?.blur()
        } else if (route.openId) open(null)
        else if (selected.size) setSelected(new Set())
        return
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        step(-1)
      } else if (e.key === 'Enter' && activeId) {
        open(activeId)
      } else if (e.key === 'x' && activeId) {
        setSelected((p) => {
          const n = new Set(p)
          if (n.has(activeId)) n.delete(activeId)
          else n.add(activeId)
          return n
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const title = route.category === 'all' ? 'All founders' : CATEGORY_LABEL[route.category]
  const icon = CAT_ICON[route.category]
  const filtered = rows.length !== base.length

  const detail = openFounder && (
    <DetailPanel
      founder={openFounder}
      onClose={() => open(null)}
      onPrev={openIndex > 0 ? () => step(-1) : undefined}
      onNext={openIndex >= 0 && openIndex < order.length - 1 ? () => step(1) : undefined}
      position={openIndex >= 0 ? { index: openIndex, total: order.length } : undefined}
    />
  )

  return (
    <>
      <PanelHeader className="gap-2 max-sm:h-auto max-sm:flex-wrap max-sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? <StatusIcon status={icon} /> : <span className="size-2 rounded-full bg-brand" />}
          <h1 className="truncate text-sm font-medium">{title}</h1>
          <span className="text-[0.8125rem] text-muted-foreground tabular">
            {filtered ? `${rows.length.toLocaleString()} of ${base.length.toLocaleString()}` : base.length.toLocaleString()}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 max-sm:w-full">
          <div className="relative max-sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in view"
              aria-label="Search founders in this view"
              className="h-8 w-full rounded-[0.6rem] border border-input bg-background pr-8 pl-8 text-xs shadow-[var(--shadow-hairline)] transition-[width,box-shadow] duration-200 outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring sm:w-44 sm:focus:w-60"
            />
            {search ? (
              <button onClick={() => setSearch('')} className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            ) : (
              <Kbd className="absolute top-1/2 right-1.5 h-4.5 min-w-4.5 -translate-y-1/2 max-sm:hidden">/</Kbd>
            )}
          </div>
          <FilterMenu />
          <DisplayMenu />
          <Button size="sm" className="h-8 gap-1.5 rounded-[0.6rem] px-3 text-xs" onClick={() => setUi({ exportOpen: true })}>
            <Download className="size-3.5" />
            <span className="max-sm:hidden">Export</span>
          </Button>
        </div>
      </PanelHeader>

      {!isDesktop && (
        <div className="scrollbar-thin overflow-x-auto border-b px-3 py-2">
          <Segmented<CategoryRoute>
            id="cat-mobile"
            size="sm"
            value={route.category}
            onChange={(c) => go('founders', c)}
            options={[
              { value: 'all', label: `All ${s.counts.all}` },
              { value: 'in_ascend', label: `In ascend ${s.counts.in_ascend}` },
              { value: 'review', label: `Review ${s.counts.review}` },
              { value: 'not_found', label: `Not in ascend ${s.counts.not_found}` },
            ]}
          />
        </div>
      )}

      <ActiveFilters />

      <div className="relative flex min-h-0 flex-1">
        <GroupedList
          compact={compact}
          collapsed={collapsed}
          onToggleGroup={(k) => setCollapsedArr((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}
        />

        {/* floating selection bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={springSoft}
              className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-popover p-1 pl-3 text-sm shadow-[var(--shadow-float)]"
            >
              <span className="pr-2 font-medium tabular">{selected.size} selected</span>
              <Button size="sm" className="h-7 gap-1.5 rounded-lg text-xs" onClick={() => setUi({ exportOpen: true })}>
                <Download className="size-3.5" /> Export
              </Button>
              <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* desktop peek panel */}
        {isDesktop && (
          <AnimatePresence>
            {openFounder && (
              <motion.aside
                key="peek"
                {...panelIn}
                className={cn(
                  'absolute top-2 right-2 bottom-2 z-30 w-[min(480px,calc(100%-1rem))] overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-float)]',
                )}
                aria-label="Founder details"
              >
                {detail}
              </motion.aside>
            )}
          </AnimatePresence>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={!!openFounder} onOpenChange={(o) => !o && open(null)}>
          <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
            <SheetTitle className="sr-only">{openFounder?.name ?? 'Founder'}</SheetTitle>
            <SheetDescription className="sr-only">Founder details</SheetDescription>
            {detail}
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
