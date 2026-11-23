import { useMemo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ListFilter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from '@/lib/columns'
import { EMPTY_FILTERS, STATUS_ORDER, activeFilterCount, facet, sourceKind, type DecisionFilter, type Filters, type SourceFilter } from '@/lib/query'
import { useStore } from '@/lib/store'
import type { MatchStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SectionLabel } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { ease } from '@/components/kit/motion'

export const EVIDENCE_LABELS: Record<string, string> = {
  employer: 'Employer',
  job_history: 'Job history',
  email: 'Email',
  email_domain: 'Company email',
  address: 'Office address',
  business_address: 'Business address',
  year: 'Degree year',
  field: 'Field of study',
  location: 'City',
  state: 'State',
  title: 'Job title',
  middle: 'Middle initial',
}
const SOURCE_LABEL: Record<SourceFilter, string> = { Both: 'Both sources', PitchBook: 'PitchBook only', Website: 'Founders site only' }
const DECISION_LABEL: Record<DecisionFilter, string> = { undecided: 'Not decided', match: 'Same person', not_match: 'Not a match', unsure: 'Unsure' }

type ListKey = 'statuses' | 'sources' | 'tiers' | 'sectors' | 'evidence' | 'decisions'

export function FilterMenu() {
  const { base, filters, setFilters, decisions } = useStore()
  const toggle = (key: ListKey, v: string) => {
    const cur = filters[key] as string[]
    setFilters({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }
  const statuses = useMemo(
    () => facet(base, (f) => f.status).sort((a, b) => STATUS_ORDER[a.value as MatchStatus] - STATUS_ORDER[b.value as MatchStatus]),
    [base],
  )
  const sources = useMemo(() => facet(base, sourceKind), [base])
  const tiers = useMemo(() => facet(base, (f) => f.tier || 'No tier').sort((a, b) => a.value.localeCompare(b.value)), [base])
  const sectors = useMemo(() => facet(base, (f) => f.sector || 'Unknown').slice(0, 14), [base])
  const evidence = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of base) for (const e of f.evidence) m.set(e.kind, (m.get(e.kind) ?? 0) + 1)
    return Object.keys(EVIDENCE_LABELS).filter((k) => m.has(k)).map((k) => ({ value: k, count: m.get(k)! }))
  }, [base])
  const decisionCounts = useMemo(() => {
    const m: Record<string, number> = { undecided: 0, match: 0, not_match: 0, unsure: 0 }
    for (const f of base) m[decisions[f.id]?.value ?? 'undecided']++
    return m
  }, [base, decisions])
  const n = activeFilterCount(filters)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-8 gap-1.5 rounded-[0.6rem] px-2.5 text-xs', n > 0 && 'border-brand/40 text-foreground')}>
          <ListFilter className="size-3.5" />
          Filter
          {n > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-semibold text-brand-foreground tabular">{n}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[340px] gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-[0.8125rem] font-medium">Filters</span>
          <Button variant="ghost" size="xs" disabled={!n} onClick={() => setFilters({ ...EMPTY_FILTERS, category: filters.category })}>
            Clear all
          </Button>
        </div>
        <div className="scrollbar-thin max-h-[min(70vh,560px)] space-y-4 overflow-y-auto p-3">
          <Group title="Match status">
            {statuses.map((s) => (
              <Option key={s.value} checked={filters.statuses.includes(s.value as MatchStatus)} onChange={() => toggle('statuses', s.value)} count={s.count} name={STATUS_LABEL[s.value as MatchStatus]}>
                <StatusIcon status={s.value as MatchStatus} className="size-3.5" />
                {STATUS_LABEL[s.value as MatchStatus]}
              </Option>
            ))}
          </Group>
          {evidence.length > 0 && (
            <Group title="Matched on">
              <div className="flex flex-wrap gap-1.5">
                {evidence.map((e) => {
                  const on = filters.evidence.includes(e.value)
                  return (
                    <button
                      key={e.value}
                      onClick={() => toggle('evidence', e.value)}
                      aria-pressed={on}
                      className={cn(
                        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
                        on ? 'border-brand/50 bg-brand/[0.08] text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {EVIDENCE_LABELS[e.value]}
                      <span className="text-[0.625rem] text-muted-foreground/70 tabular">{e.count}</span>
                    </button>
                  )
                })}
              </div>
            </Group>
          )}
          <Group title="Source">
            {sources.map((s) => (
              <Option key={s.value} checked={filters.sources.includes(s.value as SourceFilter)} onChange={() => toggle('sources', s.value)} count={s.count} name={SOURCE_LABEL[s.value as SourceFilter]}>
                {SOURCE_LABEL[s.value as SourceFilter]}
              </Option>
            ))}
          </Group>
          <Group title="Your decision">
            {(Object.keys(DECISION_LABEL) as DecisionFilter[]).map((d) => (
              <Option key={d} checked={filters.decisions.includes(d)} onChange={() => toggle('decisions', d)} count={decisionCounts[d]} name={DECISION_LABEL[d]}>
                {DECISION_LABEL[d]}
              </Option>
            ))}
          </Group>
          <Group title="Company tier">
            {tiers.map((t) => (
              <Option key={t.value} checked={filters.tiers.includes(t.value)} onChange={() => toggle('tiers', t.value)} count={t.count} name={t.value}>
                {t.value}
              </Option>
            ))}
          </Group>
          <Group title="Sector">
            {sectors.map((s) => (
              <Option key={s.value} checked={filters.sectors.includes(s.value)} onChange={() => toggle('sectors', s.value)} count={s.count} name={s.value}>
                {s.value}
              </Option>
            ))}
          </Group>
          <Group title="Has">
            <Toggle label="Email address" checked={filters.hasEmail} onChange={(v) => setFilters({ ...filters, hasEmail: v })} />
            <Toggle label="LinkedIn profile" checked={filters.hasLinkedin} onChange={(v) => setFilters({ ...filters, hasLinkedin: v })} />
            <Toggle label="Household ID" checked={filters.hasHousehold} onChange={(v) => setFilters({ ...filters, hasHousehold: v })} />
          </Group>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** Removable chips for every active filter, shown under the panel header. */
export function ActiveFilters() {
  const { filters, setFilters, search, setSearch } = useStore()
  const chips: { key: string; label: string; remove: () => void }[] = []
  const rm = (key: ListKey, v: string) => () => setFilters({ ...filters, [key]: (filters[key] as string[]).filter((x) => x !== v) })
  if (search) chips.push({ key: 'q', label: `“${search}”`, remove: () => setSearch('') })
  filters.statuses.forEach((v) => chips.push({ key: `s${v}`, label: STATUS_LABEL[v], remove: rm('statuses', v) }))
  filters.evidence.forEach((v) => chips.push({ key: `e${v}`, label: `Matched on ${EVIDENCE_LABELS[v]}`, remove: rm('evidence', v) }))
  filters.sources.forEach((v) => chips.push({ key: `o${v}`, label: SOURCE_LABEL[v], remove: rm('sources', v) }))
  filters.decisions.forEach((v) => chips.push({ key: `d${v}`, label: DECISION_LABEL[v], remove: rm('decisions', v) }))
  filters.tiers.forEach((v) => chips.push({ key: `t${v}`, label: v, remove: rm('tiers', v) }))
  filters.sectors.forEach((v) => chips.push({ key: `c${v}`, label: v, remove: rm('sectors', v) }))
  if (filters.hasEmail) chips.push({ key: 'he', label: 'Has email', remove: () => setFilters({ ...filters, hasEmail: false }) })
  if (filters.hasLinkedin) chips.push({ key: 'hl', label: 'Has LinkedIn', remove: () => setFilters({ ...filters, hasLinkedin: false }) })
  if (filters.hasHousehold) chips.push({ key: 'hh', label: 'Has household ID', remove: () => setFilters({ ...filters, hasHousehold: false }) })

  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease }}
          className="shrink-0 overflow-hidden border-b"
        >
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2">
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.span
                  layout
                  key={c.key}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.16, ease }}
                  className="inline-flex h-6 items-center gap-1 rounded-full border bg-background pr-1 pl-2.5 text-xs text-foreground/85 shadow-[var(--shadow-hairline)]"
                >
                  {c.label}
                  <button onClick={c.remove} className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Remove ${c.label}`}>
                    <X className="size-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <button
              onClick={() => {
                setSearch('')
                setFilters({ ...EMPTY_FILTERS, category: filters.category })
              }}
              className="ml-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <SectionLabel className="mb-1.5 px-1">{title}</SectionLabel>
      <div className="space-y-px">{children}</div>
    </div>
  )
}

function Option({ checked, onChange, count, name, children }: { checked: boolean; onChange: () => void; count: number; name: string; children: ReactNode }) {
  return (
    <label className={cn('flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-1.5 text-[0.8125rem] select-none hover:bg-accent', checked && 'bg-accent/70')}>
      <Checkbox checked={checked} onCheckedChange={onChange} aria-label={`${name} (${count})`} className="size-3.5" />
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      <span className="text-[0.625rem] text-muted-foreground tabular">{count}</span>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 text-[0.8125rem] select-none hover:bg-accent">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </label>
  )
}

export { activeFilterCount }
export type { Filters }
