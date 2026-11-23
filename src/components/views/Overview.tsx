import { useMemo, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BadgeCheck,
  ChartPie,
  ClipboardCheck,
  Database,
  Download,
  Inbox,
  Layers,
  ListChecks,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, type CategoryRoute } from '@/lib/store'
import { facet, sourceKind } from '@/lib/query'
import type { Founder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader, CopyId, Donut, ProgressBar, SectionLabel, type Tone } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { riseIn } from '@/components/kit/motion'

const EVIDENCE_LABEL: Record<string, string> = {
  email: 'Email on file',
  address: 'Office address',
  business_address: 'Business address',
  year: 'Degree year',
  employer: 'Employer',
  job_history: 'Job history',
  email_domain: 'Company email',
  phone: 'Phone',
  field: 'Field of study',
  location: 'City',
  middle: 'Middle initial',
  title: 'Job title',
  state: 'State',
}

const STRONG = new Set(['employer', 'job_history', 'email', 'email_domain', 'phone', 'address', 'business_address'])

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

export function Overview() {
  const { founders, counts, decisions, go, open, setUi } = useStore()

  const data = useMemo(() => {
    const confirmed = founders.filter((f) => f.category === 'in_ascend')
    const review = founders.filter((f) => f.category === 'review')

    const ev = new Map<string, number>()
    for (const f of confirmed) for (const e of f.evidence) ev.set(e.kind, (ev.get(e.kind) ?? 0) + 1)
    const evidence = [...ev.entries()]
      .filter(([k]) => EVIDENCE_LABEL[k])
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count)

    const byStrength = (a: Founder, b: Founder) => b.evidence.length - a.evidence.length || a.last.localeCompare(b.last)
    const queue = [
      ...review.filter((f) => f.status === 'PROBABLE').sort(byStrength),
      ...review.filter((f) => f.status === 'AMBIGUOUS').sort(byStrength),
    ].slice(0, 8)

    const decided = { match: 0, not_match: 0, unsure: 0 }
    for (const f of review) {
      const d = decisions[f.id]
      if (d) decided[d.value]++
    }

    const sources = { PitchBook: 0, Website: 0, Both: 0 }
    for (const f of founders) sources[sourceKind(f)]++
    const tiers = { 'Tier A': 0, 'Tier B': 0 }
    for (const f of founders) if (f.tier === 'Tier A' || f.tier === 'Tier B') tiers[f.tier]++

    const sectors = facet(
      confirmed.filter((f) => f.sector),
      (f) => f.sector,
    ).slice(0, 6)

    return { confirmed, review, evidence, queue, decided, sources, tiers, sectors }
  }, [founders, decisions])

  const decidedTotal = data.decided.match + data.decided.not_match + data.decided.unsure
  const stats: { label: string; value: number; cat: CategoryRoute; tone?: string }[] = [
    { label: 'Founders checked', value: counts.all, cat: 'all' },
    { label: 'In ascend', value: counts.in_ascend, cat: 'in_ascend', tone: 'bg-success' },
    { label: 'Needs review', value: counts.review, cat: 'review', tone: 'bg-warning' },
    { label: 'Not in ascend', value: counts.not_found, cat: 'not_found', tone: 'bg-muted-foreground/40' },
  ]

  const coverage = [
    { cat: 'in_ascend' as const, label: 'In ascend', value: counts.in_ascend, color: 'var(--success)' },
    { cat: 'review' as const, label: 'Needs review', value: counts.review, color: 'var(--warning)' },
    { cat: 'not_found' as const, label: 'Not in ascend', value: counts.not_found, color: 'var(--chart-5)' },
  ]

  const maxEvidence = data.evidence[0]?.count ?? 1
  const maxSector = data.sectors[0]?.count ?? 1
  const sourceRows: { key: keyof typeof data.sources; label: string; color: string }[] = [
    { key: 'PitchBook', label: 'PitchBook only', color: 'bg-info' },
    { key: 'Website', label: 'Founders site only', color: 'bg-brand' },
    { key: 'Both', label: 'Both sources', color: 'bg-success' },
  ]

  return (
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      {/* stat strip */}
      <motion.div {...riseIn(0)} className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => go('founders', s.cat)}
            className="group flex flex-col items-start gap-1 bg-card px-4 py-3.5 text-left transition-colors outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {s.tone && <span className={cn('size-1.5 rounded-full', s.tone)} />}
              {s.label}
            </span>
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-2xl font-semibold tracking-tight tabular">{s.value.toLocaleString()}</span>
              {s.cat !== 'all' && (
                <span className="text-xs text-muted-foreground tabular">{pct(s.value, counts.all)}%</span>
              )}
            </span>
          </button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Coverage */}
        <Tile i={0}>
          <CardHeader icon={ChartPie} title="Coverage" />
          <div className="flex flex-col items-center gap-5 px-4 pt-2 pb-4 sm:flex-row">
            <Donut
              segments={coverage.map((c) => ({ value: c.value, color: c.color, label: c.label }))}
              center={
                <div>
                  <div className="text-xl font-semibold tracking-tight tabular">{counts.all.toLocaleString()}</div>
                  <div className="text-[0.625rem] text-muted-foreground">founders</div>
                </div>
              }
            />
            <ul className="w-full flex-1 space-y-0.5">
              {coverage.map((c) => (
                <li key={c.cat}>
                  <button
                    onClick={() => go('founders', c.cat)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate text-left">{c.label}</span>
                    <span className="font-medium tabular">{c.value.toLocaleString()}</span>
                    <span className="w-9 text-right text-xs text-muted-foreground tabular">{pct(c.value, counts.all)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        {/* How we confirmed */}
        <Tile i={1}>
          <CardHeader
            icon={ShieldCheck}
            title="How we confirmed matches"
            action={<span className="text-xs text-muted-foreground tabular">{data.confirmed.length.toLocaleString()} confirmed</span>}
          />
          <ul className="space-y-2.5 px-4 pt-1 pb-4">
            {data.evidence.slice(0, 8).map((e, i) => (
              <li key={e.kind}>
                <div className="flex items-center gap-2 text-[0.8125rem]">
                  <span className="flex-1 truncate">{EVIDENCE_LABEL[e.kind]}</span>
                  {STRONG.has(e.kind) && <Badge tone="success">strong</Badge>}
                  <span className="w-10 text-right font-medium tabular">{e.count}</span>
                </div>
                <ProgressBar value={e.count} max={maxEvidence} tone={STRONG.has(e.kind) ? 'success' : 'neutral'} className="mt-1.5" delay={i * 60} />
              </li>
            ))}
          </ul>
        </Tile>

        {/* Review queue */}
        <Tile i={2} className="md:row-span-2">
          <CardHeader icon={Inbox} title="Review queue" action={<Badge tone="warning">{counts.review} to review</Badge>} />
          <p className="px-4 pb-2 text-xs text-muted-foreground">Strongest possible matches first.</p>
          <ul className="flex-1 px-2 pb-1">
            {data.queue.map((f) => (
              <li key={f.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => open(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      open(f.id)
                    }
                  }}
                  className="flex h-12 items-center gap-2.5 rounded-lg px-2 transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <StatusIcon status={f.status} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.8125rem] font-medium">{f.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{f.company || f.title || '—'}</div>
                  </div>
                  {f.ascend?.constituentId && <CopyId value={f.ascend.constituentId} label="Constituent ascend ID" />}
                </div>
              </li>
            ))}
            {!data.queue.length && <li className="px-2 py-6 text-center text-[0.8125rem] text-muted-foreground">Nothing waiting for review.</li>}
          </ul>
          <button
            onClick={() => go('founders', 'review')}
            className="group mx-2 mb-2 flex items-center justify-between rounded-lg px-2 py-2 text-[0.8125rem] font-medium text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Review all {counts.review.toLocaleString()}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </Tile>

        {/* Your review progress */}
        <Tile i={3}>
          <CardHeader
            icon={ClipboardCheck}
            title="Your review progress"
            action={<span className="text-xs text-muted-foreground tabular">{pct(decidedTotal, data.review.length)}%</span>}
          />
          <div className="px-4 pb-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular">{decidedTotal.toLocaleString()}</span>
              <span className="text-[0.8125rem] text-muted-foreground">of {data.review.length.toLocaleString()} decided</span>
            </div>
            <ProgressBar value={decidedTotal} max={data.review.length} tone="brand" className="mt-2.5" />
            {decidedTotal ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="success">{data.decided.match} same person</Badge>
                <Badge tone="danger">{data.decided.not_match} not a match</Badge>
                <Badge tone="warning">{data.decided.unsure} unsure</Badge>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Open anyone in <span className="font-medium text-foreground">Needs review</span> and mark them Same person,
                Not a match or Unsure. Decisions stay in this browser and appear in exports.
              </p>
            )}
          </div>
        </Tile>

        {/* Sources */}
        <Tile i={4}>
          <CardHeader icon={Layers} title="Sources" />
          <div className="px-4 pb-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {sourceRows.map((s) => (
                <div
                  key={s.key}
                  className={cn('h-full origin-left animate-grow-x first:rounded-l-full last:rounded-r-full', s.color)}
                  style={{ width: `${pct(data.sources[s.key], counts.all)}%` }}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {sourceRows.map((s) => (
                <li key={s.key} className="flex items-center gap-2 text-[0.8125rem]">
                  <span className={cn('size-2 rounded-full', s.color)} />
                  <span className="flex-1">{s.label}</span>
                  <span className="font-medium tabular">{data.sources[s.key].toLocaleString()}</span>
                  <span className="w-9 text-right text-xs text-muted-foreground tabular">{pct(data.sources[s.key], counts.all)}%</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t pt-3">
              <SectionLabel>Company tier (founders site)</SectionLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(data.tiers) as (keyof typeof data.tiers)[]).map((t) => (
                  <div key={t} className="rounded-lg border bg-muted/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{t}</div>
                    <div className="text-lg font-semibold tracking-tight tabular">{data.tiers[t]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Tile>

        {/* Top sectors */}
        <Tile i={5}>
          <CardHeader icon={Database} title="Top sectors in ascend" />
          <ul className="space-y-2.5 px-4 pt-1 pb-4">
            {data.sectors.map((s, i) => (
              <li key={s.value}>
                <div className="flex items-center gap-2 text-[0.8125rem]">
                  <span className="flex-1 truncate">{s.value}</span>
                  <span className="font-medium tabular">{s.count}</span>
                </div>
                <ProgressBar value={s.count} max={maxSector} tone="info" className="mt-1.5" delay={i * 60} />
              </li>
            ))}
            {!data.sectors.length && <li className="text-[0.8125rem] text-muted-foreground">No sector data.</li>}
          </ul>
        </Tile>

        {/* Quick exports */}
        <Tile i={6}>
          <CardHeader icon={Download} title="Quick exports" />
          <div className="flex flex-col gap-2 px-4 pb-4">
            <QuickExport icon={BadgeCheck} tone="success" title="ascend IDs of confirmed matches" hint="Names with constituent and household IDs" onClick={() => setUi({ exportOpen: true })} />
            <QuickExport icon={ListChecks} tone="warning" title="Review worksheet" hint="Evidence, ascend details and your decisions" onClick={() => setUi({ exportOpen: true })} />
            <QuickExport icon={Database} tone="neutral" title="Everything" hint="Every founder, every column" onClick={() => setUi({ exportOpen: true })} />
          </div>
        </Tile>
      </div>
    </div>
  )
}

function Tile({ i, className, children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <motion.div {...riseIn(i + 1)} className={cn('flex', className)}>
      <Card className="w-full">{children}</Card>
    </motion.div>
  )
}

const TONE_TILE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/12 text-success-ink',
  warning: 'bg-warning/14 text-warning-ink',
  info: 'bg-info/12 text-info-ink',
  danger: 'bg-danger/10 text-destructive',
}

function QuickExport({ icon: Icon, tone, title, hint, onClick }: { icon: typeof Download; tone: Tone; title: string; hint: string; onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="group h-auto justify-start gap-3 rounded-lg px-3 py-2.5 text-left">
      <span className={cn('grid size-7 shrink-0 place-items-center rounded-md', TONE_TILE[tone])}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-medium">{title}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
      <Download className="size-3.5 text-muted-foreground transition-transform group-hover:translate-y-px" />
    </Button>
  )
}
