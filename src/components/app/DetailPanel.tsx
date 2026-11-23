import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  AtSign,
  Phone,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GraduationCap,
  Home,
  Link2,
  Mail,
  MapPin,
  Type,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STATUS_HINT, STATUS_LABEL } from '@/lib/columns'
import { copyText } from '@/lib/prefs'
import { useStore } from '@/lib/store'
import type { DecisionValue, Founder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Avatar, Badge, Chip, CopyId, IconButton, Kbd, SectionLabel } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { CompanyLogo, FounderAvatar } from './visuals'
import { ease } from '@/components/kit/motion'

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
  phone: Phone,
}
const STRONG = new Set(['employer', 'job_history', 'email', 'email_domain', 'phone', 'address', 'business_address'])

interface Props {
  founder: Founder
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
  position?: { index: number; total: number }
}

export function DetailPanel({ founder: f, onPrev, onNext, onClose, position }: Props) {
  const a = f.ascend
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2.5">
        <IconButton label="Previous" shortcut="K" onClick={onPrev} disabled={!onPrev} className="size-8">
          <ChevronUp />
        </IconButton>
        <IconButton label="Next" shortcut="J" onClick={onNext} disabled={!onNext} className="size-8">
          <ChevronDown />
        </IconButton>
        {position && (
          <span className="ml-1 text-xs text-muted-foreground tabular">
            {position.index + 1} <span className="text-muted-foreground/50">/ {position.total}</span>
          </span>
        )}
        <span className="ml-auto text-[0.625rem] text-muted-foreground/60 tabular">{f.id}</span>
        <IconButton label="Close" shortcut="Esc" onClick={onClose} className="size-8">
          <X />
        </IconButton>
      </div>

      <motion.div
        key={f.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease }}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto"
      >
        {/* identity */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3.5">
            <FounderAvatar founder={f} size="lg" status={false} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg leading-snug font-semibold tracking-tight">{f.name}</h2>
              <p className="text-[0.8125rem] text-muted-foreground">{f.title || '—'}</p>
              {f.company && (
                <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-foreground/85">
                  <CompanyLogo founder={f} size="sm" />
                  <span className="truncate">{f.company}</span>
                  {f.stage && <span className="truncate text-muted-foreground">· {f.stage}</span>}
                </p>
              )}
              {f.aliases.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground/80">Also listed as {f.aliases.join(', ')}</p>}
            </div>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full border bg-background px-2 text-xs font-medium">
              <StatusIcon status={f.status} className="size-3.5" />
              {STATUS_LABEL[f.status]}
            </span>
            <span className="text-xs text-muted-foreground">{STATUS_HINT[f.status]}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {a?.contactUrl && (
              <Button asChild size="sm" className="h-8 rounded-[0.6rem] text-xs">
                <a href={a.contactUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" /> Open in ascend
                </a>
              </Button>
            )}
            {a?.householdUrl && (
              <Button asChild size="sm" variant="outline" className="h-8 rounded-[0.6rem] text-xs">
                <a href={a.householdUrl} target="_blank" rel="noreferrer">
                  <Home className="size-3.5" /> Household
                </a>
              </Button>
            )}
            {a?.constituentId && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-[0.6rem] text-xs"
                onClick={async () => {
                  if (await copyText(`${a.constituentId}\t${a.householdId ?? ''}`)) toast.success('Both ascend IDs copied', { description: 'Tab-separated — paste straight into Excel' })
                }}
              >
                <Copy className="size-3.5" /> Copy IDs
              </Button>
            )}
            {f.linkedin && (
              <Button asChild size="sm" variant="ghost" className="h-8 rounded-[0.6rem] text-xs text-muted-foreground">
                <a href={withScheme(f.linkedin)} target="_blank" rel="noreferrer">
                  <Link2 className="size-3.5" /> LinkedIn
                </a>
              </Button>
            )}
            {f.emails[0] && (
              <Button asChild size="sm" variant="ghost" className="h-8 rounded-[0.6rem] text-xs text-muted-foreground">
                <a href={`mailto:${f.emails[0]}`}>
                  <Mail className="size-3.5" /> Email
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* ascend */}
        {a && (
          <Section title={f.category === 'in_ascend' ? 'ascend record' : 'Closest ascend record'}>
            <div className="grid grid-cols-2 gap-2">
              <IdTile label="Constituent ID" value={a.constituentId} />
              <IdTile label="Household ID" value={a.householdId} sub={a.householdName} />
            </div>
            <Props>
              <Prop label="Name">{a.name}</Prop>
              <Prop label="Type">{a.type}</Prop>
              <Prop label="Employer">{a.employer}</Prop>
              <Prop label="Job title">{a.jobTitle}</Prop>
              <Prop label="Degree">{[a.degree, a.major].filter(Boolean).join(', ')}</Prop>
              <Prop label="Degree year">{a.degreeYear}</Prop>
              <Prop label="College">{a.college}</Prop>
            </Props>
            <ListBlock title="Job history" items={a.jobHistory} />
            <ListBlock title="Emails on file" items={a.emails} />
            <ListBlock title="Addresses on file" items={a.addresses} />
            <ListBlock title="Phones on file" items={a.phones ?? []} />
            <ListBlock title="Degrees on file" items={a.degrees ?? []} />
            <ListBlock title="Other names" items={a.otherNames.filter((n) => n.toLowerCase() !== f.name.toLowerCase())} />
          </Section>
        )}

        {/* evidence */}
        <Section title={f.category === 'in_ascend' ? 'Why it’s the same person' : f.category === 'review' ? 'What lines up' : 'Search record'}>
          {f.evidence.length ? (
            <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
              {f.evidence.map((e, i) => {
                const Icon = EVIDENCE_ICON[e.kind] ?? Briefcase
                const strong = STRONG.has(e.kind)
                return (
                  <motion.li
                    key={e.kind}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease, delay: 0.04 * i }}
                    className="relative flex gap-3"
                  >
                    <span className={cn('relative z-10 grid size-6 shrink-0 place-items-center rounded-full border bg-surface', strong && 'border-success/40 bg-success/10')}>
                      <Icon className={cn('size-3', strong ? 'text-success-ink' : 'text-muted-foreground')} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 text-[0.8125rem] font-medium">
                        {e.label}
                        {strong && <Badge tone="success">Strong</Badge>}
                      </div>
                      <p className="text-xs break-words text-muted-foreground">{e.text}</p>
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          ) : (
            <p className="text-[0.8125rem] text-muted-foreground">
              {f.category === 'not_found' ? 'No constituent with this name, nickname or email was found in ascend.' : 'Only the name matches — nothing else agrees yet.'}
            </p>
          )}
          {f.note && <p className="mt-3 rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{f.note}</p>}
          {f.searches.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {f.searches.map((s) => (
                <Chip key={s} dot={false}>
                  {s}
                </Chip>
              ))}
            </div>
          )}
        </Section>

        {f.category !== 'in_ascend' && <DecisionBlock key={f.id} founder={f} />}

        {f.others.length > 0 && (
          <Section title={`Other namesakes checked · ${f.others.length}`}>
            <ul className="divide-y overflow-hidden rounded-lg border">
              {f.others.map((o) => (
                <li key={o.constituentId + o.name} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={o.name} size="xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.8125rem]">{o.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{[o.type, o.degreeYear, o.employer].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <CopyId value={o.constituentId} label="Constituent ascend ID" />
                  {o.contactUrl && (
                    <a href={o.contactUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${o.name} in ascend`}>
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {f.website.map((w) => (
          <Section key={w.id} title="Northeastern Founders site">
            {w.headline && <p className="mb-3 text-[0.8125rem] text-foreground/80">“{w.headline}”</p>}
            <Props>
              <Prop label="Title">{w.title || w.companyRole}</Prop>
              <Prop label="Company">{w.company}</Prop>
              <Prop label="Current role">{[w.currentTitle, w.currentCompany].filter(Boolean).join(' · ')}</Prop>
              <Prop label="Based in">{w.basedIn}</Prop>
              <Prop label="Degree">{w.degree}</Prop>
              <Prop label="Field">{w.field}</Prop>
              <Prop label="Years">{w.years || w.classOf}</Prop>
              <Prop label="Emails">{w.emails.join(', ')}</Prop>
              <Prop label="LinkedIn" href={withScheme(w.linkedin)}>{w.linkedin}</Prop>
            </Props>
            <div className="mt-3 rounded-lg border bg-muted/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-[0.8125rem] font-medium">
                <CompanyLogo founder={f} size="sm" /> {w.company}
                {w.tier && <Chip tone={w.tier.endsWith('A') ? 'brand' : 'neutral'} className="ml-auto">{w.tier}</Chip>}
              </div>
              <Props dense>
                <Prop label="Sector">{w.sector}</Prop>
                <Prop label="Industry">{w.industry}</Prop>
                <Prop label="HQ">{w.hq}</Prop>
                <Prop label="Employees">{w.employees}</Prop>
                <Prop label="Founded">{w.founded}</Prop>
                <Prop label="Funding">{w.funding}</Prop>
                <Prop label="Last round">{w.lastRound}</Prop>
                <Prop label="Revenue">{w.revenue}</Prop>
                <Prop label="Investors">{w.investors}</Prop>
                <Prop label="Website" href={withScheme(w.website)}>{w.website}</Prop>
              </Props>
            </div>
          </Section>
        ))}
        {f.pitchbook.map((p) => (
          <Section key={p.row} title="PitchBook">
            <Props>
              <Prop label="Position">{p.position}</Prop>
              <Prop label="Company">{p.company}</Prop>
              <Prop label="Company type">{p.companyType}</Prop>
              <Prop label="Email">{p.email}</Prop>
              <Prop label="Phone">{p.phone}</Prop>
              <Prop label="Location">{p.location}</Prop>
              <Prop label="Address">{p.address}</Prop>
              <Prop label="Website" href={withScheme(p.companyWebsite)}>{p.companyWebsite}</Prop>
              <Prop label="LinkedIn" href={withScheme(p.linkedin)}>{p.linkedin}</Prop>
              <Prop label="Deal roles">{[p.roles && `${p.roles} roles`, p.boardSeats && `${p.boardSeats} board seats`, p.dealRoles && `${p.dealRoles} deal roles`].filter(Boolean).join(' · ')}</Prop>
            </Props>
          </Section>
        ))}
        <div className="h-8" />
      </motion.div>
    </div>
  )
}

function DecisionBlock({ founder: f }: { founder: Founder }) {
  const { decisions, setDecision } = useStore()
  const decision = decisions[f.id]
  const [note, setNote] = useState(decision?.note ?? '')
  const opts: { v: DecisionValue; label: string; on: string }[] = [
    { v: 'match', label: 'Same person', on: 'border-success/50 bg-success/12 text-success-ink' },
    { v: 'not_match', label: 'Not a match', on: 'border-danger/45 bg-danger/10 text-destructive' },
    { v: 'unsure', label: 'Unsure', on: 'border-warning/50 bg-warning/14 text-warning-ink' },
  ]
  const set = (v: DecisionValue | null, n = note) => setDecision(f.id, v ? { value: v, note: n || undefined, at: new Date().toISOString() } : null)
  return (
    <Section title="Your call">
      <div className="grid grid-cols-3 gap-1.5">
        {opts.map((o) => {
          const on = decision?.value === o.v
          return (
            <button
              key={o.v}
              aria-pressed={on}
              onClick={() => set(on ? null : o.v)}
              className={cn(
                'h-8 rounded-[0.6rem] border text-xs font-medium transition-all duration-150 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                on ? o.on : 'bg-background text-foreground/80 shadow-[var(--shadow-hairline)]',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => decision && note !== (decision.note ?? '') && set(decision.value, note)}
        placeholder={decision ? 'Add a note — saved when you click away' : 'Pick an option, then add a note if it helps'}
        disabled={!decision}
        rows={2}
        className="mt-2 w-full resize-y rounded-lg border bg-background px-3 py-2 text-[0.8125rem] placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      />
      <p className="mt-1.5 text-[0.625rem] text-muted-foreground">
        Saved in this browser · included in Excel exports as <span className="font-medium">Your decision</span> · press <Kbd className="h-4 min-w-4 px-0.5">X</Kbd> in the list to select
      </p>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t px-5 py-4">
      <SectionLabel className="mb-3">{title}</SectionLabel>
      {children}
    </section>
  )
}

function Props({ children, dense }: { children: ReactNode; dense?: boolean }) {
  return <dl className={cn('mt-3 space-y-1', dense && 'mt-0 space-y-0.5')}>{children}</dl>
}

function Prop({ label, children, href }: { label: string; children?: ReactNode; href?: string }) {
  if (!children || (typeof children === 'string' && !children.trim())) return null
  return (
    <div className="grid grid-cols-[104px_1fr] items-baseline gap-3 rounded-md py-1 text-[0.8125rem]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground/90">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="underline decoration-border underline-offset-2 hover:decoration-foreground/40">
            {children}
          </a>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}

function IdTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-muted/35 px-3 py-2.5">
      <div className="text-[0.625rem] font-medium text-muted-foreground">{label}</div>
      {value ? <CopyId value={value} label={`${label}`} size="lg" /> : <div className="py-0.5 text-[1.05rem] text-muted-foreground/40">—</div>}
      {sub && <div className="truncate text-[0.625rem] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[0.625rem] text-muted-foreground">{title}</div>
      <ul className="space-y-1">
        {items.map((x, i) => (
          <li key={i} className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs break-words text-foreground/85">
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
