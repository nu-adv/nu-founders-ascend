import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from '@/lib/columns'
import { EMPTY_FILTERS, STATUS_ORDER, activeFilterCount, facet, sourceKind, type DecisionFilter, type Filters, type SourceFilter } from '@/lib/query'
import type { Decisions, Founder, MatchStatus } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { StatusDot } from './bits'

const EVIDENCE_LABELS: Record<string, string> = {
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

const DECISION_OPTS: { v: DecisionFilter; label: string }[] = [
  { v: 'undecided', label: 'Not decided yet' },
  { v: 'match', label: 'Same person' },
  { v: 'not_match', label: 'Not a match' },
  { v: 'unsure', label: 'Unsure' },
]

interface Props {
  base: Founder[] // founders in the current category (counts are computed from these)
  filters: Filters
  setFilters: (f: Filters) => void
  decisions: Decisions
}

export function FilterPanel({ base, filters, setFilters, decisions }: Props) {
  const toggle = <K extends 'statuses' | 'sources' | 'tiers' | 'sectors' | 'evidence' | 'decisions'>(key: K, v: Filters[K][number]) => {
    const cur = filters[key] as string[]
    const next = cur.includes(v as string) ? cur.filter((x) => x !== v) : [...cur, v as string]
    setFilters({ ...filters, [key]: next })
  }

  const statuses = useMemo(
    () => facet(base, (f) => f.status).sort((a, b) => STATUS_ORDER[a.value as MatchStatus] - STATUS_ORDER[b.value as MatchStatus]),
    [base],
  )
  const sources = useMemo(() => facet(base, sourceKind), [base])
  const tiers = useMemo(() => facet(base, (f) => f.tier || 'No tier').sort((a, b) => a.value.localeCompare(b.value)), [base])
  const sectors = useMemo(() => facet(base, (f) => f.sector || 'Unknown'), [base])
  const evidence = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of base) for (const e of f.evidence) m.set(e.kind, (m.get(e.kind) ?? 0) + 1)
    return Object.keys(EVIDENCE_LABELS)
      .filter((k) => m.has(k))
      .map((k) => ({ value: k, count: m.get(k)! }))
  }, [base])
  const decisionCounts = useMemo(() => {
    const m: Record<string, number> = { undecided: 0, match: 0, not_match: 0, unsure: 0 }
    for (const f of base) m[decisions[f.id]?.value ?? 'undecided']++
    return m
  }, [base, decisions])

  const n = activeFilterCount(filters)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-4">
        <span className="text-[0.72rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">Filters</span>
        {n > 0 && (
          <Button variant="ghost" size="xs" onClick={() => setFilters({ ...EMPTY_FILTERS, category: filters.category })}>
            <RotateCcw /> Reset {n}
          </Button>
        )}
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <Group title="Match status">
          {statuses.map((s) => (
            <Option
              key={s.value}
              checked={filters.statuses.includes(s.value as MatchStatus)}
              onChange={() => toggle('statuses', s.value as MatchStatus)}
              count={s.count}
              name={STATUS_LABEL[s.value as MatchStatus]}
            >
              <StatusDot status={s.value as MatchStatus} /> {STATUS_LABEL[s.value as MatchStatus]}
            </Option>
          ))}
        </Group>

        <Group title="Source">
          {sources.map((s) => (
            <Option
              key={s.value}
              checked={filters.sources.includes(s.value as SourceFilter)}
              onChange={() => toggle('sources', s.value as SourceFilter)}
              count={s.count}
              name={s.value}
            >
              {s.value === 'Both' ? 'Both sources' : s.value === 'Website' ? 'Founders site only' : 'PitchBook only'}
            </Option>
          ))}
        </Group>

        {evidence.length > 0 && (
          <Group title="Matched on">
            {evidence.map((e) => (
              <Option key={e.value} checked={filters.evidence.includes(e.value)} onChange={() => toggle('evidence', e.value)} count={e.count} name={EVIDENCE_LABELS[e.value]}>
                {EVIDENCE_LABELS[e.value]}
              </Option>
            ))}
          </Group>
        )}

        <Group title="Your decision">
          {DECISION_OPTS.map((d) => (
            <Option
              key={d.v}
              checked={filters.decisions.includes(d.v)}
              onChange={() => toggle('decisions', d.v)}
              count={decisionCounts[d.v]}
              name={d.label}
            >
              {d.label}
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

        <Group title="Sector" defaultOpen={false}>
          {sectors.map((s) => (
            <Option key={s.value} checked={filters.sectors.includes(s.value)} onChange={() => toggle('sectors', s.value)} count={s.count} name={s.value}>
              {s.value}
            </Option>
          ))}
        </Group>

        <Group title="Has">
          <ToggleRow label="An email address" checked={filters.hasEmail} onChange={(v) => setFilters({ ...filters, hasEmail: v })} />
          <ToggleRow label="A LinkedIn profile" checked={filters.hasLinkedin} onChange={(v) => setFilters({ ...filters, hasLinkedin: v })} />
          <ToggleRow label="A household ID" checked={filters.hasHousehold} onChange={(v) => setFilters({ ...filters, hasHousehold: v })} />
        </Group>
      </div>
    </div>
  )
}

function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="pb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted"
        aria-expanded={open}
      >
        <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        {title}
      </button>
      {open && <div className="mt-0.5 space-y-px">{children}</div>}
    </div>
  )
}

function Option({ checked, onChange, count, children, name }: { checked: boolean; onChange: () => void; count: number; children: ReactNode; name?: string }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[0.84rem] transition-colors select-none hover:bg-muted',
        checked && 'bg-muted',
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} aria-label={name ? `${name} (${count})` : undefined} />
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      <span className="font-mono text-[0.7rem] text-muted-foreground tabular">{count}</span>
    </label>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.84rem] select-none hover:bg-muted">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </label>
  )
}
