import { useState, type ReactNode } from 'react'
import {
  AtSign,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Copy,
  ExternalLink,
  GraduationCap,
  Home,
  Link2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Type,
  UserRoundSearch,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STATUS_HINT } from '@/lib/columns'
import { copyText } from '@/lib/prefs'
import type { Decision, DecisionValue, Founder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, IdChip, Kbd, StatusBadge } from './bits'

interface Props {
  founder: Founder
  decision?: Decision
  onDecision: (id: string, d: Decision | null) => void
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
  position?: { index: number; total: number }
}

const EVIDENCE_ICON: Record<string, typeof Mail> = {
  employer: Briefcase,
  job_history: Briefcase,
  email: AtSign,
  email_domain: AtSign,
  address: Building2,
  business_address: Building2,
  year: GraduationCap,
  field: GraduationCap,
  location: MapPin,
  state: MapPin,
  title: Briefcase,
  middle: Type,
}

const STRONG = new Set(['employer', 'job_history', 'email', 'email_domain', 'address', 'business_address'])

export function DetailPanel({ founder: f, decision, onDecision, onPrev, onNext, onClose, position }: Props) {
  const a = f.ascend
  const ids = [a?.constituentId, a?.householdId].filter(Boolean)
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-3">
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onPrev} disabled={!onPrev} aria-label="Previous founder">
                <ChevronUp />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Previous <Kbd className="ml-1">K</Kbd>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={onNext} disabled={!onNext} aria-label="Next founder">
                <ChevronDown />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Next <Kbd className="ml-1">J</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
        {position && (
          <span className="font-mono text-xs text-muted-foreground tabular">
            {position.index + 1} / {position.total}
          </span>
        )}
        <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground/70">{f.id}</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close details">
          <X />
        </Button>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {/* header */}
        <header className="relative overflow-hidden border-b px-6 pt-6 pb-5">
          <div className="nu-hatch pointer-events-none absolute inset-0 text-brand opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="relative flex items-start gap-4">
            <Avatar name={f.name} className="size-12 text-sm" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-[1.65rem] leading-tight font-medium tracking-[-0.01em]">{f.name}</h2>
              {f.aliases.length > 0 && <p className="text-sm text-muted-foreground">Also listed as {f.aliases.join(', ')}</p>}
              <p className="mt-1 text-sm text-foreground/80">{[f.title, f.company].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={f.status} />
                <span className="text-xs text-muted-foreground">{STATUS_HINT[f.status]}</span>
              </div>
            </div>
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            {a?.contactUrl && (
              <Button asChild size="sm">
                <a href={a.contactUrl} target="_blank" rel="noreferrer">
                  <ExternalLink /> Open in ascend
                </a>
              </Button>
            )}
            {a?.householdUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={a.householdUrl} target="_blank" rel="noreferrer">
                  <Home /> Household
                </a>
              </Button>
            )}
            {ids.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const text = `${a?.constituentId ?? ''}\t${a?.householdId ?? ''}`
                  if (await copyText(text)) toast.success('Both ascend IDs copied (tab-separated, paste into Excel)')
                }}
              >
                <Copy /> Copy IDs
              </Button>
            )}
            {f.linkedin && (
              <Button asChild size="sm" variant="ghost">
                <a href={withScheme(f.linkedin)} target="_blank" rel="noreferrer">
                  <Link2 /> LinkedIn
                </a>
              </Button>
            )}
            {f.emails[0] && (
              <Button asChild size="sm" variant="ghost">
                <a href={`mailto:${f.emails[0]}`}>
                  <Mail /> Email
                </a>
              </Button>
            )}
          </div>
        </header>

        {/* ascend */}
        {a ? (
          <Section title={f.category === 'in_ascend' ? 'In ascend' : 'Closest ascend record'} icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-2">
              <IdTile label="Constituent ascend ID" value={a.constituentId} />
              <IdTile label="Household ascend ID" value={a.householdId} sub={a.householdName} />
            </div>
            <Fields>
              <Field label="Name in ascend" value={a.name} />
              <Field label="Constituent type" value={a.type} />
              <Field label="Employer" value={a.employer} />
              <Field label="Job title" value={a.jobTitle} />
              <Field label="Degree" value={[a.degree, a.major].filter(Boolean).join(', ')} />
              <Field label="Degree year" value={a.degreeYear} />
              <Field label="College" value={a.college} wide />
            </Fields>
            <ListBlock title="Job history" items={a.jobHistory} />
            <ListBlock title="Emails on file" items={a.emails} mono />
            <ListBlock title="Addresses on file" items={a.addresses} />
            <ListBlock title="Other names" items={a.otherNames.filter((n) => n.toLowerCase() !== f.name.toLowerCase())} />
          </Section>
        ) : null}

        {/* evidence */}
        <Section
          title={f.category === 'in_ascend' ? 'Why it’s the same person' : f.category === 'review' ? 'What lines up' : 'Search record'}
          icon={f.category === 'not_found' ? Search : UserRoundSearch}
        >
          {f.evidence.length ? (
            <ul className="space-y-2">
              {f.evidence.map((e) => {
                const Icon = EVIDENCE_ICON[e.kind] ?? Check
                return (
                  <li key={e.kind} className="flex gap-3 rounded-lg border bg-card/60 px-3 py-2.5">
                    <Icon className={cn('mt-0.5 size-4 shrink-0', STRONG.has(e.kind) ? 'text-success' : 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-wide uppercase">
                        {e.label}
                        {STRONG.has(e.kind) && <span className="ml-2 font-medium text-success normal-case">strong</span>}
                      </div>
                      <div className="text-sm break-words text-foreground/80">{e.text}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {f.category === 'not_found'
                ? 'No constituent with this name, nickname or email was found in ascend.'
                : 'Only the name matches — no other detail agrees yet.'}
            </p>
          )}
          {f.note && <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{f.note}</p>}
          {f.searches.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {f.searches.map((s) => (
                <span key={s} className="rounded-md border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* review decision */}
        {f.category !== 'in_ascend' && (
          <DecisionBlock key={`${f.id}:${decision?.at ?? ''}`} founder={f} decision={decision} onDecision={onDecision} />
        )}

        {/* other namesakes */}
        {f.others.length > 0 && (
          <Section title={`Other ascend namesakes checked (${f.others.length})`} icon={CircleHelp}>
            <ul className="divide-y rounded-lg border">
              {f.others.map((o) => (
                <li key={o.constituentId + o.name} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{o.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[o.type, o.degreeYear, o.employer, o.jobTitle].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <IdChip value={o.constituentId} label="Constituent ascend ID" />
                  {o.contactUrl && (
                    <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${o.name} in ascend`}>
                      <a href={o.contactUrl} target="_blank" rel="noreferrer">
                        <ExternalLink />
                      </a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* sources */}
        {f.website.map((w) => (
          <Section key={w.id} title="Northeastern Founders site" icon={GraduationCap} badge="Website">
            {w.headline && <p className="mb-3 text-sm text-foreground/80 italic">“{w.headline}”</p>}
            <Fields>
              <Field label="Title" value={[w.title, w.companyRole].filter(Boolean)[0]} />
              <Field label="Company" value={w.company} />
              <Field label="Current title" value={w.currentTitle} />
              <Field label="Current company" value={w.currentCompany} />
              <Field label="Based in" value={w.basedIn} wide />
              <Field label="Degree" value={w.degree} />
              <Field label="Field" value={w.field} />
              <Field label="Years" value={w.years || w.classOf} />
              <Field label="Degree confidence" value={w.confidence} />
              <Field label="Emails" value={w.emails.join(', ')} wide mono />
              <Field label="LinkedIn" value={w.linkedin} link={withScheme(w.linkedin)} wide />
            </Fields>
            <div className="mt-4 rounded-lg border bg-surface p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <Building2 className="size-3.5" /> {w.company}
                {w.tier && <span className={cn('ml-auto', w.tier.endsWith('A') && 'text-primary')}>{w.tier}</span>}
              </div>
              <Fields>
                <Field label="Sector" value={w.sector} />
                <Field label="Industry" value={w.industry} />
                <Field label="HQ" value={w.hq} />
                <Field label="Employees" value={w.employees} />
                <Field label="Founded" value={w.founded} />
                <Field label="Status" value={w.status || w.companyType} />
                <Field label="Total funding" value={w.funding} />
                <Field label="Revenue" value={w.revenue} />
                <Field label="Last round" value={w.lastRound} wide />
                <Field label="Investors" value={w.investors} wide />
                <Field label="Website" value={w.website} link={withScheme(w.website)} wide />
              </Fields>
            </div>
          </Section>
        ))}
        {f.pitchbook.map((p) => (
          <Section key={p.row} title="PitchBook" icon={Briefcase} badge={`Row ${p.row}`}>
            <Fields>
              <Field label="Position" value={p.position} wide />
              <Field label="Company" value={p.company} />
              <Field label="Company type" value={p.companyType} />
              <Field label="Email" value={p.email} mono />
              <Field label="Phone" value={p.phone} mono />
              <Field label="Location" value={p.location} />
              <Field label="Company website" value={p.companyWebsite} link={withScheme(p.companyWebsite)} />
              <Field label="Address" value={p.address} wide />
              <Field label="LinkedIn" value={p.linkedin} link={withScheme(p.linkedin)} wide />
              <Field label="Roles" value={p.roles} />
              <Field label="Board seats" value={p.boardSeats} />
              <Field label="Deal roles" value={p.dealRoles} />
            </Fields>
          </Section>
        ))}
        <div className="h-10" />
      </div>
    </div>
  )
}

function DecisionBlock({ founder: f, decision, onDecision }: { founder: Founder; decision?: Decision; onDecision: Props['onDecision'] }) {
  const [note, setNote] = useState(decision?.note ?? '')
  const opts: { v: DecisionValue; label: string; cls: string }[] = [
    { v: 'match', label: 'Same person', cls: 'data-[on=true]:bg-success data-[on=true]:text-success-foreground data-[on=true]:border-success' },
    { v: 'not_match', label: 'Not a match', cls: 'data-[on=true]:bg-primary data-[on=true]:text-primary-foreground data-[on=true]:border-primary' },
    { v: 'unsure', label: 'Unsure', cls: 'data-[on=true]:bg-warning data-[on=true]:text-warning-foreground data-[on=true]:border-warning' },
  ]
  const set = (v: DecisionValue | null, n = note) =>
    onDecision(f.id, v ? { value: v, note: n || undefined, at: new Date().toISOString() } : null)
  return (
    <Section title="Your call" icon={Check}>
      <div className="grid grid-cols-3 gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            data-on={decision?.value === o.v}
            onClick={() => set(decision?.value === o.v ? null : o.v)}
            className={cn(
              'h-9 rounded-md border text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              o.cls,
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => decision && note !== (decision.note ?? '') && set(decision.value, note)}
        placeholder={decision ? 'Add a note (saved when you click away)' : 'Pick an option above, then add a note if useful'}
        disabled={!decision}
        rows={2}
        className="mt-2 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Saved in this browser only. Use the <span className="font-medium">Your decision</span> column in the Excel export to share it.
      </p>
    </Section>
  )
}

function Section({ title, icon: Icon, badge, children }: { title: string; icon: typeof Mail; badge?: string; children: ReactNode }) {
  return (
    <section className="border-b px-6 py-5">
      <h3 className="mb-3 flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        <Icon className="size-3.5 text-brand" />
        {title}
        {badge && <span className="ml-auto rounded border px-1.5 py-px text-[0.65rem] tracking-wide">{badge}</span>}
      </h3>
      {children}
    </section>
  )
}

function Fields({ children }: { children: ReactNode }) {
  return <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
}

function Field({ label, value, wide, mono, link }: { label: string; value?: string; wide?: boolean; mono?: boolean; link?: string }) {
  if (!value) return null
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <dt className="text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm break-words text-foreground/90', mono && 'font-mono text-[0.8rem]')}>
        {link ? (
          <a href={link} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:decoration-primary">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function IdTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
      {value ? <IdChip value={value} label={label} className="-ml-1.5 text-base" /> : <div className="text-muted-foreground">—</div>}
      {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ListBlock({ title, items, mono }: { title: string; items: string[]; mono?: boolean }) {
  if (!items.length) return null
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[0.7rem] text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {items.map((x, i) => (
          <li key={i} className={cn('rounded-md bg-muted/60 px-2.5 py-1.5 text-[0.82rem] break-words', mono && 'font-mono text-[0.78rem]')}>
            {x}
          </li>
        ))}
      </ul>
    </div>
  )
}

function withScheme(u: string) {
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}
