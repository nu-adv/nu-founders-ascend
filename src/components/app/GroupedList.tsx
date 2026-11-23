import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronRight, GripVertical, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLUMN_BY_ID, DECISION_LABEL, STATUS_LABEL, type ColumnDef } from '@/lib/columns'
import { STATUS_ORDER, sourceKind } from '@/lib/query'
import { useStore, type GroupBy } from '@/lib/store'
import type { Founder, MatchStatus } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge, Chip, CopyId, EmptyState } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { CompanyLogo, FounderAvatar } from './visuals'

type Item =
  | { kind: 'group'; key: string; label: string; count: number; status?: MatchStatus; collapsed: boolean }
  | { kind: 'row'; founder: Founder; index: number }

const GROUP_H = 36
const GROUP_GAP = 12
const ROW_H = { comfortable: 54, compact: 40 }
const ROW_H_MOBILE = 64
const LEAD_MIN = 268

function groupKey(f: Founder, by: GroupBy): string {
  if (by === 'status') return f.status
  if (by === 'source') return sourceKind(f)
  if (by === 'tier') return f.tier || 'No tier'
  return 'all'
}

const SOURCE_LABEL: Record<string, string> = { Both: 'In both sources', PitchBook: 'PitchBook only', Website: 'Founders site only' }

function groupLabel(key: string, by: GroupBy) {
  if (by === 'status') return STATUS_LABEL[key as MatchStatus]
  if (by === 'source') return SOURCE_LABEL[key] ?? key
  return key
}

function groupOrder(a: string, b: string, by: GroupBy) {
  if (by === 'status') return STATUS_ORDER[a as MatchStatus] - STATUS_ORDER[b as MatchStatus]
  if (by === 'source') return ['Both', 'PitchBook', 'Website'].indexOf(a) - ['Both', 'PitchBook', 'Website'].indexOf(b)
  return a.localeCompare(b)
}

/** Flatten rows into group headers + rows in on-screen order (also used for J/K navigation). */
export function buildItems(rows: Founder[], groupBy: GroupBy, collapsed: Set<string>): Item[] {
  if (groupBy === 'none') return rows.map((f, index) => ({ kind: 'row', founder: f, index }))
  const groups = new Map<string, Founder[]>()
  for (const f of rows) {
    const k = groupKey(f, groupBy)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(f)
  }
  const out: Item[] = []
  let index = 0
  for (const key of [...groups.keys()].sort((a, b) => groupOrder(a, b, groupBy))) {
    const list = groups.get(key)!
    const isCollapsed = collapsed.has(`${groupBy}:${key}`)
    out.push({ kind: 'group', key, label: groupLabel(key, groupBy), count: list.length, status: groupBy === 'status' ? (key as MatchStatus) : undefined, collapsed: isCollapsed })
    if (!isCollapsed) for (const f of list) out.push({ kind: 'row', founder: f, index: index++ })
  }
  return out
}

export function visualOrder(rows: Founder[], groupBy: GroupBy, collapsed: Set<string>): Founder[] {
  return buildItems(rows, groupBy, collapsed).flatMap((i) => (i.kind === 'row' ? [i.founder] : []))
}

interface Props {
  compact: boolean // phone layout
  collapsed: Set<string>
  onToggleGroup: (key: string) => void
}

export function GroupedList({ compact: mobile, collapsed, onToggleGroup }: Props) {
  const { rows, groupBy, listColumns, setListColumns, route, open, activeId, setActiveId, selected, setSelected, decisions, sort, setSort, resetFilters, density } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastClicked = useRef<string | null>(null)
  const dense = density === 'compact'

  const columns = useMemo(
    () =>
      listColumns
        .filter((id) => id !== 'name')
        .map((id) => COLUMN_BY_ID[id])
        .filter((c): c is ColumnDef => !!c?.inList),
    [listColumns],
  )
  const items = useMemo(() => buildItems(rows, groupBy, collapsed), [rows, groupBy, collapsed])
  const visibleRows = useMemo(() => items.flatMap((i) => (i.kind === 'row' ? [i.founder] : [])), [items])

  const rowH = mobile ? ROW_H_MOBILE : ROW_H[density]
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (items[i].kind === 'group' ? GROUP_H + (i === 0 ? 0 : GROUP_GAP) : rowH),
    overscan: 14,
  })
  useEffect(() => virtualizer.measure(), [items, rowH, virtualizer])

  useEffect(() => {
    if (!activeId) return
    const i = items.findIndex((it) => it.kind === 'row' && it.founder.id === activeId)
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'auto' })
  }, [activeId, items, virtualizer])

  const template = `minmax(${LEAD_MIN}px,1.25fr) ${columns.map((c) => `${c.width}px`).join(' ')}`
  const minWidth = LEAD_MIN + columns.reduce((s, c) => s + c.width, 0) + 24
  const anySelected = selected.size > 0

  // drag a column header to reorder columns (order persists in this browser)
  const [drag, setDrag] = useState<{ id: string; over?: string; side?: 'before' | 'after' } | null>(null)
  const reorder = (id: string, target: string, side: 'before' | 'after') => {
    if (id === target) return
    const ids = columns.map((c) => c.id).filter((x) => x !== id)
    const at = ids.indexOf(target) + (side === 'after' ? 1 : 0)
    ids.splice(at, 0, id)
    setListColumns(['name', ...ids])
  }

  const toggleSort = (id: string) =>
    setSort((s) => (s.column === id ? { column: id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { column: id, dir: COLUMN_BY_ID[id]?.align === 'right' ? 'desc' : 'asc' }))

  const toggleSelect = (id: string, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && lastClicked.current) {
        const a = visibleRows.findIndex((r) => r.id === lastClicked.current)
        const b = visibleRows.findIndex((r) => r.id === id)
        if (a >= 0 && b >= 0) {
          const on = !prev.has(id)
          for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
            if (on) next.add(visibleRows[i].id)
            else next.delete(visibleRows[i].id)
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
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon={SearchX}
        title="No founders match"
        body="Try a different search, or clear the filters to see everyone in this view."
        action={
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear search & filters
          </Button>
        }
      />
    )
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin relative min-h-0 flex-1 overflow-auto overscroll-contain" role="grid" aria-rowcount={visibleRows.length}>
      <div className="relative px-2 sm:px-3" style={{ height: virtualizer.getTotalSize() + 24, minWidth: mobile ? undefined : minWidth }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const it = items[vi.index]
          const style = { transform: `translateY(${vi.start + 8}px)`, height: vi.size } as const
          if (it.kind === 'group') {
            const k = `${groupBy}:${it.key}`
            return (
              <div key={`g-${it.key}`} className="absolute inset-x-2 top-0 flex items-end sm:inset-x-3" style={style}>
                <div
                  role="row"
                  onClick={() => onToggleGroup(k)}
                  aria-expanded={!it.collapsed}
                  className={cn(
                    'grid h-9 w-full cursor-pointer items-center rounded-lg border bg-[color-mix(in_oklch,var(--muted)_75%,var(--surface))] transition-colors select-none hover:bg-muted',
                    mobile && 'flex',
                  )}
                  style={mobile ? undefined : { gridTemplateColumns: template }}
                >
                  <div className="sticky left-0 z-[1] flex h-full items-center gap-2 rounded-l-lg bg-inherit pl-2">
                    <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform duration-200', !it.collapsed && 'rotate-90')} />
                    {it.status ? <StatusIcon status={it.status} className="size-3.5" /> : <span className="size-2 rounded-full bg-muted-foreground/40" />}
                    <span className="truncate text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase">{it.label}</span>
                    <span className="text-xs text-muted-foreground/60 tabular">{it.count}</span>
                  </div>
                  {!mobile &&
                    columns.map((c) => (
                      <button
                        key={c.id}
                        draggable
                        title="Click to sort · drag to move"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSort(c.id)
                        }}
                        onDragStart={(e) => {
                          e.stopPropagation()
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', c.id)
                          setDrag({ id: c.id })
                        }}
                        onDragOver={(e) => {
                          if (!drag || drag.id === c.id) return
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                          const r = e.currentTarget.getBoundingClientRect()
                          const side = e.clientX < r.left + r.width / 2 ? 'before' : 'after'
                          if (drag.over !== c.id || drag.side !== side) setDrag({ ...drag, over: c.id, side })
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (drag?.over && drag.side) reorder(drag.id, drag.over, drag.side)
                          setDrag(null)
                        }}
                        onDragEnd={() => setDrag(null)}
                        className={cn(
                          'group/col relative flex h-full cursor-grab items-center gap-1 truncate px-2.5 text-[0.625rem] font-medium tracking-[0.05em] text-muted-foreground/65 uppercase transition-colors select-none hover:text-foreground active:cursor-grabbing',
                          c.align === 'right' && 'justify-end',
                          sort.column === c.id && 'text-foreground/85',
                          drag?.id === c.id && 'opacity-35',
                        )}
                      >
                        <GripVertical className="absolute left-0 size-3 opacity-0 transition-opacity group-hover/col:opacity-50" />
                        <span className="truncate">{c.label}</span>
                        {sort.column === c.id && (sort.dir === 'asc' ? <ArrowUp className="size-2.5 shrink-0" /> : <ArrowDown className="size-2.5 shrink-0" />)}
                        {drag?.over === c.id && (
                          <span className={cn('pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-brand', drag.side === 'before' ? '-left-px' : '-right-px')} />
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )
          }
          const f = it.founder
          const isOpen = route.openId === f.id
          const isActive = activeId === f.id
          const isSel = selected.has(f.id)
          const d = decisions[f.id]
          return (
            <div
              key={f.id}
              role="row"
              aria-selected={isSel}
              onClick={() => {
                setActiveId(f.id)
                open(f.id)
              }}
              className={cn(
                'group/row absolute inset-x-2 top-0 cursor-pointer rounded-lg bg-surface transition-colors duration-150 sm:inset-x-3',
                'hover:bg-[color-mix(in_oklch,var(--accent)_80%,var(--surface))]',
                isSel && 'bg-[color-mix(in_oklch,var(--brand)_6%,var(--surface))] hover:bg-[color-mix(in_oklch,var(--brand)_9%,var(--surface))]',
                (isActive || isOpen) && 'bg-accent hover:bg-accent',
                isOpen && 'shadow-[inset_0_0_0_1px_var(--border)]',
              )}
              style={style}
            >
              {mobile ? (
                <MobileRow founder={f} selected={isSel} anySelected={anySelected} onToggle={(s) => toggleSelect(f.id, s)} />
              ) : (
                <div className="grid h-full items-center" style={{ gridTemplateColumns: template }}>
                  {/* sticky lead: select · photo · name/title */}
                  <div className="sticky left-0 z-[1] flex h-full min-w-0 items-center gap-2.5 rounded-l-lg bg-inherit pr-3 pl-1.5">
                    <span className="grid w-5 place-items-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSel}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelect(f.id, e.shiftKey)
                        }}
                        aria-label={`Select ${f.name}`}
                        className={cn('size-3.5 transition-opacity', !isSel && !anySelected && 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100')}
                      />
                    </span>
                    <FounderAvatar founder={f} size={dense ? 'sm' : 'md'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={cn('truncate text-sm text-foreground', !dense && 'font-medium')}>{f.name}</span>
                        {d && (
                          <Badge tone={d.value === 'match' ? 'success' : d.value === 'not_match' ? 'danger' : 'warning'} className="shrink-0">
                            {DECISION_LABEL[d.value]}
                          </Badge>
                        )}
                        {dense && f.title && <span className="truncate text-xs text-muted-foreground">{f.title}</span>}
                      </div>
                      {!dense && <div className="truncate text-xs text-muted-foreground">{f.title || '—'}</div>}
                    </div>
                  </div>
                  {columns.map((c) => (
                    <div key={c.id} className={cn('min-w-0 px-2.5', c.align === 'right' && 'text-right')} role="gridcell">
                      <Cell column={c} founder={f} dense={dense} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const muted = <span className="text-xs text-muted-foreground/40">—</span>

function Cell({ column, founder: f, dense }: { column: ColumnDef; founder: Founder; dense: boolean }) {
  const { decisions } = useStore()
  switch (column.id) {
    case 'company':
      if (!f.company) return muted
      return (
        <div className="flex min-w-0 items-center gap-2.5">
          <CompanyLogo founder={f} size={dense ? 'sm' : 'md'} />
          <div className="min-w-0">
            <div className="truncate text-[0.8125rem] text-foreground/90">{f.company}</div>
            {!dense && f.stage && <div className="truncate text-xs text-muted-foreground">{f.stage}</div>}
          </div>
        </div>
      )
    case 'northeastern':
      if (!f.neDegree && !f.neClass) return muted
      return (
        <div className="min-w-0" title={f.neSource === 'ascend' ? 'From ascend (degree on record)' : 'From the founders site'}>
          <div className="truncate text-[0.8125rem] text-foreground/90">{f.neDegree || '—'}</div>
          {!dense && (
            <div className="truncate text-xs text-muted-foreground">
              {f.neClass || 'Year not listed'}
              {f.neSource === 'ascend' && <span className="ml-1 text-muted-foreground/60">· ascend</span>}
            </div>
          )}
        </div>
      )
    case 'ascendIds':
      if (!f.ascend?.constituentId) return muted
      return (
        <div className={cn('flex min-w-0', dense ? 'items-center gap-2' : 'flex-col items-start')}>
          <CopyId value={f.ascend.constituentId} label="Constituent ascend ID" className="text-foreground/85" />
          {!dense && f.ascend.householdId && (
            <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground/70">
              HH <CopyId value={f.ascend.householdId} label="Household ascend ID" className="text-[0.6875rem]" />
            </span>
          )}
        </div>
      )
    case 'constituentId':
      return <CopyId value={f.ascend?.constituentId ?? ''} label="Constituent ascend ID" />
    case 'householdId':
      return <CopyId value={f.ascend?.householdId ?? ''} label="Household ascend ID" />
    case 'matchedOn': {
      if (!f.evidence.length) return muted
      const strong = new Set(['employer', 'job_history', 'email', 'email_domain', 'address', 'business_address'])
      const ev = [...f.evidence].sort((a, b) => Number(strong.has(b.kind)) - Number(strong.has(a.kind)))
      return (
        <span className="flex min-w-0 items-center gap-1">
          <Chip tone={strong.has(ev[0].kind) ? 'success' : 'neutral'} className="min-w-0">
            <span className="truncate">{ev[0].label}</span>
          </Chip>
          {ev.length > 1 && <span className="text-[0.625rem] text-muted-foreground tabular">+{ev.length - 1}</span>}
        </span>
      )
    }
    case 'status':
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusIcon status={f.status} className="size-3.5" />
          {STATUS_LABEL[f.status]}
        </span>
      )
    case 'sources':
      return (
        <span className="flex gap-1">
          {f.sources.map((s) => (
            <Chip key={s} dot={false}>
              {s === 'PitchBook' ? 'PitchBook' : 'Web'}
            </Chip>
          ))}
        </span>
      )
    case 'tier':
      return f.tier ? <Chip tone={f.tier.endsWith('A') ? 'brand' : 'neutral'}>{f.tier}</Chip> : muted
    case 'staff':
    case 'funding': {
      const v = column.value(f)
      return v ? <span className="text-[0.8125rem] text-foreground/85 tabular">{v}</span> : muted
    }
    default: {
      const v = column.value(f, decisions[f.id])
      return v ? (
        <span className={cn('block truncate text-[0.8125rem] text-foreground/80', column.mono && 'tabular')} title={v}>
          {v}
        </span>
      ) : (
        muted
      )
    }
  }
}

function MobileRow({ founder: f, selected, anySelected, onToggle }: { founder: Founder; selected: boolean; anySelected: boolean; onToggle: (shift: boolean) => void }) {
  return (
    <div className="flex h-full items-center gap-3 px-2">
      {anySelected && (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected}
            onClick={(e) => {
              e.stopPropagation()
              onToggle(e.shiftKey)
            }}
            aria-label={`Select ${f.name}`}
          />
        </span>
      )}
      <FounderAvatar founder={f} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{f.name}</span>
          {f.tier && <Chip tone={f.tier.endsWith('A') ? 'brand' : 'neutral'} className="ml-auto">{f.tier}</Chip>}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {f.company && <CompanyLogo founder={f} size="xs" />}
          <span className="truncate">{f.company || f.title || '—'}</span>
          {f.ascend?.constituentId && <span className="ml-auto shrink-0 tabular">{f.ascend.constituentId}</span>}
        </div>
      </div>
    </div>
  )
}
