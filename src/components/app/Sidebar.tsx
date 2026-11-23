import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, CircleCheck, CircleDashed, CircleOff, Keyboard, LayoutGrid, Lock, Monitor, Moon, Sun, Users } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from '@/lib/columns'
import { EMPTY_FILTERS } from '@/lib/query'
import { useStore, type CategoryRoute, type View } from '@/lib/store'
import type { MatchStatus } from '@/lib/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BrandMark } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'
import { spring } from '@/components/kit/motion'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { route, go, counts, founders, filters, setFilters, decisions } = useStore()
  const nav = (view: View, cat?: CategoryRoute) => {
    go(view, cat)
    onNavigate?.()
  }
  const reviewBreakdown = useMemo(() => {
    const m = new Map<MatchStatus, number>()
    for (const f of founders) if (f.category === 'review') m.set(f.status, (m.get(f.status) ?? 0) + 1)
    return (['PROBABLE', 'AMBIGUOUS', 'POSSIBLE', 'UNVERIFIED', 'NOT CHECKED'] as MatchStatus[]).filter((s) => m.has(s)).map((s) => ({ s, n: m.get(s)! }))
  }, [founders])
  const decided = useMemo(() => founders.filter((f) => f.category === 'review' && decisions[f.id]).length, [founders, decisions])

  const isCat = (c: CategoryRoute) => route.view === 'founders' && route.category === c && filters.statuses.length === 0
  const openStatus = (s: MatchStatus) => {
    setFilters({ ...EMPTY_FILTERS, statuses: [s] })
    nav('founders', 'review')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceSwitcher />
      <nav className="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 pb-3 pl-3">
        <NavItem icon={LayoutGrid} label="Overview" active={route.view === 'overview'} onClick={() => nav('overview')} />
        <NavItem icon={Users} label="All founders" count={counts.all} active={isCat('all')} onClick={() => nav('founders', 'all')} />

        <Section title="Match results">
          <NavItem
            glyph={<StatusIcon status="CONFIRMED" className="size-3.5" />}
            label="In ascend"
            count={counts.in_ascend}
            active={isCat('in_ascend')}
            onClick={() => nav('founders', 'in_ascend')}
          />
          <NavItem
            glyph={<StatusIcon status="PROBABLE" className="size-3.5" />}
            label="Needs review"
            count={counts.review}
            active={isCat('review')}
            onClick={() => nav('founders', 'review')}
            hint={decided ? `${decided} decided` : undefined}
          />
          <NavItem
            glyph={<StatusIcon status="NOT FOUND" className="size-3.5" />}
            label="Not in ascend"
            count={counts.not_found}
            active={isCat('not_found')}
            onClick={() => nav('founders', 'not_found')}
          />
        </Section>

        <Section title="Review queue">
          {reviewBreakdown.map(({ s, n }) => (
            <NavItem
              key={s}
              dense
              glyph={<StatusIcon status={s} className="size-3.5" />}
              label={STATUS_LABEL[s]}
              count={n}
              active={route.view === 'founders' && filters.statuses.length === 1 && filters.statuses[0] === s}
              onClick={() => openStatus(s)}
            />
          ))}
        </Section>

        <Section title="Saved views">
          <NavItem dense icon={CircleCheck} label="Matched by email" onClick={() => { setFilters({ ...EMPTY_FILTERS, evidence: ['email'] }); nav('founders', 'in_ascend') }} />
          <NavItem dense icon={CircleDashed} label="Tier A founders" onClick={() => { setFilters({ ...EMPTY_FILTERS, tiers: ['Tier A'] }); nav('founders', 'all') }} />
          <NavItem dense icon={CircleOff} label="Undecided reviews" onClick={() => { setFilters({ ...EMPTY_FILTERS, decisions: ['undecided'] }); nav('founders', 'review') }} />
        </Section>
      </nav>
      <div className="border-t border-sidebar-border px-3 py-2.5 text-[0.625rem] text-muted-foreground/80">
        Encrypted · read-only snapshot
      </div>
    </div>
  )
}

function WorkspaceSwitcher() {
  const { lock, setUi } = useStore()
  const { theme, setTheme } = useTheme()
  return (
    <div className="px-3 pt-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring">
            <BrandMark />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold tracking-tight">Founders × ascend</span>
              <span className="block truncate text-[0.625rem] text-muted-foreground">Advancement Research</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
            <DropdownMenuRadioItem value="light"><Sun className="size-4" /> Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon className="size-4" /> Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Monitor className="size-4" /> System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setUi({ shortcutsOpen: true })}>
            <Keyboard className="size-4" /> Keyboard shortcuts <DropdownMenuShortcut>?</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={lock}>
            <Lock className="size-4" /> Lock workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="group/sec flex w-full items-center gap-1 px-2 pb-1 text-[0.625rem] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={cn('size-3 transition-transform duration-200', !open && '-rotate-90')} />
        {title}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-0.5 overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  glyph,
  label,
  count,
  active,
  onClick,
  dense,
  hint,
}: {
  icon?: typeof Users
  glyph?: ReactNode
  label: string
  count?: number
  active?: boolean
  onClick: () => void
  dense?: boolean
  hint?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:h-10',
        dense ? 'h-8' : 'h-9',
        active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={spring}
          className="absolute inset-0 -z-0 rounded-lg bg-surface shadow-[var(--shadow-panel)] dark:bg-sidebar-accent"
        />
      )}
      <span className="relative z-10 grid size-4 place-items-center">{glyph ?? (Icon && <Icon className="size-4" />)}</span>
      <span className="relative z-10 flex-1 truncate">{label}</span>
      {hint && <span className="relative z-10 text-[0.625rem] text-muted-foreground/70">{hint}</span>}
      {count !== undefined && <span className="relative z-10 text-xs text-muted-foreground/70 tabular">{count.toLocaleString()}</span>}
    </button>
  )
}
