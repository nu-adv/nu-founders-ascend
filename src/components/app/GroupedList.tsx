import { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronRight, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLUMN_BY_ID, DECISION_LABEL, STATUS_LABEL, type ColumnDef } from '@/lib/columns'
import { STATUS_ORDER, sourceKind } from '@/lib/query'
import { useStore, type GroupBy } from '@/lib/store'
import type { Founder, MatchStatus } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Chip, CopyId, EmptyState } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'

type Item =
  | { kind: 'group'; key: string; label: string; count: number; status?: MatchStatus; collapsed: boolean }
  | { kind: 'row'; founder: Founder; index: number }

const GROUP_H = 36
const ROW_H = 40
const ROW_H_COMPACT = 60
const SELECT_W = 28
const ICON_W = 24

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
  compact: boolean
  collapsed: Set<string>
  onToggleGroup: (key: string) => void
}

export function GroupedList({ compact, collapsed, onToggleGroup }: Props) {
  const { rows, groupBy, listColumns, route, open, activeId, setActiveId, selected, setSelected, decisions, sort, setSort, resetFilters } = useStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastClicked = useRef<string | null>(null)

  const columns = useMemo(
    () => listColumns.filter((id) => id !== 'name').map((id) => COLUMN_BY_ID[id]).filter((c): c is ColumnDef => !!c?.inList),
    [listColumns],
  )

  const items = useMemo(() => buildItems(rows, groupBy, collapsed), [rows, groupBy, collapsed])

  const visibleRows = useMemo(() => items.filter((i): i is Extract<Item, { kind: 'row' }> => i.kind === 'row').map((i) => i.founder), [items])

  const rowH = compact ? ROW_H_COMPACT : ROW_H
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (items[i].kind === 'group' ? GROUP_H + (i === 0 ? 0 : 10) : rowH),
    overscan: 16,
  })
  useEffect(() => virtualizer.measure(), [items, rowH, virtualizer])

  // keep keyboard cursor in view
  useEffect(() => {
    if (!activeId) return
    const i = items.findIndex((it) => it.kind === 'row' && it.founder.id === activeId)
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'auto' })
  }, [activeId, items, virtualizer])

  const template = `${SELECT_W}px ${ICON_W}px minmax(240px,1fr) ${columns.map((c) => `${c.width}px`).join(' ')}`
  const minWidth = SELECT_W + ICON_W + 240 + columns.reduce((s, c) => s + c.width, 0) + 32
  const anySelected = selected.size > 0

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
    <div ref={scrollRef} className="scrollbar-thin relative min-h-0 flex-1 overflow-auto" role="grid" aria-rowcount={visibleRows.length}>
      <div className="relative px-2 sm:px-4" style={{ height: virtualizer.getTotalSize() + 24, minWidth: compact ? undefined : minWidth }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const it = items[vi.index]
          const style = { transform: `translateY(${vi.start + 8}px)`, height: vi.size } as const
          if (it.kind === 'group') {
            const k = `${groupBy}:${it.key}`
            return (
              <div key={`g-${it.key}`} className="absolute inset-x-2 top-0 flex items-end sm:inset-x-4" style={style}>
                <div
                  role="row"
                  onClick={() => onToggleGroup(k)}
                  className={cn(
                    'grid h-9 w-full cursor-pointer items-center rounded-lg border bg-muted/45 pr-3 transition-colors select-none hover:bg-muted/80',
                    compact && 'flex gap-2 pl-2',
                  )}
                  style={compact ? undefined : { gridTemplateColumns: template }}
                  aria-expanded={!it.collapsed}
                >
                  <span className="grid place-items-center">
                    <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform duration-200', !it.collapsed && 'rotate-90')} />
                  </span>
                  {it.status ? <StatusIcon status={it.status} /> : <span className="size-2 justify-self-center rounded-full bg-muted-foreground/40" />}
                  <span className="flex min-w-0 items-center gap-2 pl-1">
                    <span className="truncate text-xs font-semibold tracking-[0.05em] text-muted-foreground uppercase">{it.label}</span>
                    <span className="text-xs text-muted-foreground/60 tabular">{it.count}</span>
                  </span>
                  {!compact &&
                    columns.map((c) => (
                      <button
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSort((s) => (s.column === c.id ? { column: c.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { column: c.id, dir: 'asc' }))
                        }}
                        className={cn(
                          'flex items-center gap-1 truncate px-2 text-left text-[0.625rem] font-medium tracking-[0.05em] text-muted-foreground/60 uppercase transition-colors hover:text-foreground',
                          sort.column === c.id && 'text-foreground/80',
                        )}
                      >
                        <span className="truncate">{c.label}</span>
                        {sort.column === c.id && (sort.dir === 'asc' ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />)}
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
                'group/row absolute inset-x-2 top-0 cursor-pointer rounded-lg transition-colors duration-150 sm:inset-x-4',
                'hover:bg-accent/70',
                isSel && 'bg-brand/[0.05] hover:bg-brand/[0.08]',
                isActive && !isOpen && 'bg-accent',
                isOpen && 'bg-accent ring-1 ring-border ring-inset',
              )}
              style={style}
            >
              {compact ? (
                <CompactRow founder={f} selected={isSel} anySelected={anySelected} onToggle={(s) => toggleSelect(f.id, s)} />
              ) : (
                <div className="grid h-full items-center pr-3" style={{ gridTemplateColumns: template }}>
                  <span className="grid place-items-center" onClick={(e) => e.stopPropagation()}>
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
                  <StatusIcon status={f.status} />
                  <div className="flex min-w-0 items-center gap-2 pl-1">
                    <span className="truncate text-sm text-foreground">{f.name}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-1 pl-2">
                      {d && (
                        <Badge tone={d.value === 'match' ? 'success' : d.value === 'not_match' ? 'danger' : 'warning'}>{DECISION_LABEL[d.value]}</Badge>
                      )}
                      {f.tier && <Chip tone={f.tier.endsWith('A') ? 'brand' : 'neutral'}>{f.tier.replace('Tier ', 'Tier ')}</Chip>}
                    </span>
                  </div>
                  {columns.map((c) => (
                    <div key={c.id} className="min-w-0 px-2" role="gridcell">
                      <Cell column={c} founder={f} />
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

function Cell({ column, founder: f }: { column: ColumnDef; founder: Founder }) {
  const { decisions } = useStore()
  switch (column.id) {
    case 'constituentId':
      return <CopyId value={f.ascend?.constituentId ?? ''} label="Constituent ascend ID" />
    case 'householdId':
      return <CopyId value={f.ascend?.householdId ?? ''} label="Household ascend ID" />
    case 'matchedOn': {
      if (!f.evidence.length) return <span className="text-xs text-muted-foreground/40">—</span>
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
      return f.tier ? <Chip tone={f.tier.endsWith('A') ? 'brand' : 'neutral'}>{f.tier}</Chip> : <span className="text-xs text-muted-foreground/40">—</span>
    case 'company':
      return <span className="block truncate text-[0.8125rem] text-foreground/80">{f.company || '—'}</span>
    default: {
      const v = column.value(f, decisions[f.id])
      return v ? (
        <span className={cn('block truncate text-xs text-muted-foreground', column.mono && 'tabular')} title={v}>
          {v}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground/40">—</span>
      )
    }
  }
}

function CompactRow({ founder: f, selected, anySelected, onToggle }: { founder: Founder; selected: boolean; anySelected: boolean; onToggle: (shift: boolean) => void }) {
  return (
    <div className="flex h-full items-center gap-3 px-2">
      {anySelected ? (
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
      ) : (
        <Avatar name={f.name} size="md" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusIcon status={f.status} className="size-3.5" />
          <span className="truncate text-sm font-medium">{f.name}</span>
          {f.tier && <Chip tone={f.tier.endsWith('A') ? 'brand' : 'neutral'} className="ml-auto">{f.tier}</Chip>}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="truncate">{f.company || f.title || '—'}</span>
          {f.ascend?.constituentId && <span className="shrink-0 tabular">· C {f.ascend.constituentId}</span>}
          {f.ascend?.householdId && <span className="shrink-0 tabular">H {f.ascend.householdId}</span>}
        </div>
      </div>
    </div>
  )
}
