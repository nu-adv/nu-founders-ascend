import { useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, SearchX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DECISION_LABEL, type ColumnDef } from '@/lib/columns'
import type { Sort } from '@/lib/query'
import type { Decisions, Founder } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, IdChip, StatusBadge } from './bits'

interface Props {
  rows: Founder[]
  columns: ColumnDef[]
  activeId: string | null
  openId: string | null
  selected: Set<string>
  decisions: Decisions
  sort: Sort
  compact: boolean
  onActivate: (id: string) => void
  onOpen: (id: string) => void
  onToggleSelect: (id: string, shift: boolean) => void
  onToggleAll: () => void
  onSort: (columnId: string) => void
  onClearFilters: () => void
}

const SELECT_W = 44

export function FounderList(props: Props) {
  const { rows, columns, activeId, openId, selected, decisions, sort, compact } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowHeight = compact ? 84 : 56

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 14,
  })

  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, virtualizer])

  // keep the keyboard cursor in view
  const activeIndex = useMemo(() => rows.findIndex((r) => r.id === activeId), [rows, activeId])
  useEffect(() => {
    if (activeIndex >= 0) virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
  }, [activeIndex, virtualizer])

  const template = `${SELECT_W}px ${columns.map((c) => (c.id === 'name' ? `minmax(${c.width}px, 1.6fr)` : `${c.width}px`)).join(' ')}`
  const minWidth = SELECT_W + columns.reduce((s, c) => s + c.width, 0)
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id))

  if (!rows.length) {
    return (
      <div className="grid flex-1 place-items-center p-10 text-center">
        <div className="max-w-sm">
          <SearchX className="mx-auto mb-3 size-8 text-muted-foreground/60" />
          <p className="font-heading text-xl">Nobody matches that.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filters.</p>
          <button onClick={props.onClearFilters} className="mt-4 text-sm font-medium text-primary hover:underline">
            Clear search and filters
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin relative min-h-0 flex-1 overflow-auto" role="grid" aria-rowcount={rows.length}>
      {!compact && (
        <div
          className="sticky top-0 z-10 grid h-9 items-center border-b bg-background/92 text-[0.72rem] font-medium tracking-wide text-muted-foreground uppercase backdrop-blur"
          style={{ gridTemplateColumns: template, minWidth }}
          role="row"
        >
          <div className="flex justify-center" role="columnheader">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={props.onToggleAll}
              aria-label="Select all rows in view"
            />
          </div>
          {columns.map((c) => (
            <button
              key={c.id}
              role="columnheader"
              onClick={() => props.onSort(c.id)}
              className={cn(
                'flex h-full items-center gap-1 truncate px-3 text-left transition-colors hover:text-foreground',
                sort.column === c.id && 'text-foreground',
              )}
              aria-sort={sort.column === c.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="truncate">{c.label}</span>
              {sort.column === c.id &&
                (sort.dir === 'asc' ? <ArrowUp className="size-3 shrink-0" /> : <ArrowDown className="size-3 shrink-0" />)}
            </button>
          ))}
        </div>
      )}

      <div style={{ height: virtualizer.getTotalSize(), minWidth: compact ? undefined : minWidth, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const f = rows[vi.index]
          const isActive = f.id === activeId
          const isOpen = f.id === openId
          const isSel = selected.has(f.id)
          return (
            <div
              key={f.id}
              role="row"
              aria-selected={isSel}
              data-active={isActive || undefined}
              onClick={() => {
                props.onActivate(f.id)
                props.onOpen(f.id)
              }}
              onMouseEnter={() => undefined}
              className={cn(
                'group absolute inset-x-0 top-0 cursor-pointer border-b border-border/60 transition-colors',
                'hover:bg-muted/55',
                isSel && 'bg-primary/[0.045] dark:bg-primary/[0.07]',
                isOpen && 'bg-accent hover:bg-accent',
                isActive && 'shadow-[inset_2px_0_0_var(--brand)]',
              )}
              style={{ transform: `translateY(${vi.start}px)`, height: vi.size }}
            >
              {compact ? (
                <CompactRow founder={f} selected={isSel} onToggle={(shift) => props.onToggleSelect(f.id, shift)} />
              ) : (
                <div className="grid h-full items-center" style={{ gridTemplateColumns: template, minWidth }}>
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onClick={(e) => {
                        e.stopPropagation()
                        props.onToggleSelect(f.id, e.shiftKey)
                      }}
                      aria-label={`Select ${f.name}`}
                      className={cn('transition-opacity', !isSel && 'opacity-40 group-hover:opacity-100')}
                    />
                  </div>
                  {columns.map((c) => (
                    <div key={c.id} className="min-w-0 px-3" role="gridcell">
                      <Cell column={c} founder={f} decisions={decisions} />
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

function Cell({ column, founder: f, decisions }: { column: ColumnDef; founder: Founder; decisions: Decisions }) {
  switch (column.id) {
    case 'name':
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={f.name} />
          <div className="min-w-0">
            <div className="truncate text-[0.9rem] font-semibold tracking-[-0.01em] text-foreground">
              {f.name}
              {f.aliases.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground">· {f.aliases[0]}</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {[f.title, f.company].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        </div>
      )
    case 'status':
      return <StatusBadge status={f.status} withHint />
    case 'constituentId':
      return <IdChip value={f.ascend?.constituentId ?? ''} label="Constituent ascend ID" className="-ml-1.5" />
    case 'householdId':
      return <IdChip value={f.ascend?.householdId ?? ''} label="Household ascend ID" className="-ml-1.5" />
    case 'sources':
      return (
        <div className="flex gap-1">
          {f.sources.map((s) => (
            <span
              key={s}
              className="rounded border border-border px-1.5 py-px text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {s === 'PitchBook' ? 'PitchBook' : 'Web'}
            </span>
          ))}
        </div>
      )
    case 'decision': {
      const d = decisions[f.id]
      if (!d) return <span className="text-muted-foreground/40">—</span>
      return (
        <span
          className={cn(
            'text-xs font-medium',
            d.value === 'match' ? 'text-success' : d.value === 'not_match' ? 'text-primary' : 'text-warning',
          )}
        >
          {DECISION_LABEL[d.value]}
        </span>
      )
    }
    case 'tier':
      return f.tier ? (
        <span className={cn('text-xs font-semibold', f.tier.endsWith('A') ? 'text-primary' : 'text-muted-foreground')}>{f.tier}</span>
      ) : (
        <span className="text-muted-foreground/40">—</span>
      )
    default: {
      const v = column.value(f, decisions[f.id])
      return v ? (
        <div className={cn('truncate text-[0.84rem] text-foreground/85', column.mono && 'font-mono text-[0.8rem] tabular')} title={v}>
          {v}
        </div>
      ) : (
        <span className="text-muted-foreground/40">—</span>
      )
    }
  }
}

function CompactRow({ founder: f, selected, onToggle }: { founder: Founder; selected: boolean; onToggle: (shift: boolean) => void }) {
  return (
    <div className="flex h-full items-center gap-3 px-4">
      <div onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(e.shiftKey)
          }}
          aria-label={`Select ${f.name}`}
        />
      </div>
      <Avatar name={f.name} status={f.status} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold">{f.name}</span>
          <StatusBadge status={f.status} className="h-5 px-2 text-[0.68rem]" />
        </div>
        <div className="truncate text-xs text-muted-foreground">{[f.title, f.company].filter(Boolean).join(' · ') || '—'}</div>
        {f.ascend?.constituentId ? (
          <div className="mt-1 flex gap-3 font-mono text-[0.72rem] text-muted-foreground tabular">
            <span>
              C <span className="text-foreground/85">{f.ascend.constituentId}</span>
            </span>
            {f.ascend.householdId && (
              <span>
                H <span className="text-foreground/85">{f.ascend.householdId}</span>
              </span>
            )}
          </div>
        ) : (
          <div className="mt-1 truncate text-[0.72rem] text-muted-foreground">{f.emails[0] ?? f.location}</div>
        )}
      </div>
    </div>
  )
}
