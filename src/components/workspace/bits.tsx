import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STATUS_HINT, STATUS_LABEL } from '@/lib/columns'
import { copyText } from '@/lib/prefs'
import type { MatchStatus } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const STATUS_STYLE: Record<MatchStatus, string> = {
  CONFIRMED: 'bg-success/12 text-success ring-success/25',
  PROBABLE: 'bg-warning/14 text-warning ring-warning/30',
  POSSIBLE: 'bg-warning/8 text-warning/85 ring-warning/20',
  UNVERIFIED: 'bg-muted text-muted-foreground ring-border',
  AMBIGUOUS: 'bg-info/12 text-info ring-info/25',
  'NOT CHECKED': 'bg-muted text-muted-foreground ring-border',
  'NOT FOUND': 'bg-transparent text-muted-foreground ring-border',
}

const STATUS_DOT: Record<MatchStatus, string> = {
  CONFIRMED: 'bg-success',
  PROBABLE: 'bg-warning',
  POSSIBLE: 'bg-warning/60',
  UNVERIFIED: 'bg-muted-foreground/50',
  AMBIGUOUS: 'bg-info',
  'NOT CHECKED': 'bg-muted-foreground/40',
  'NOT FOUND': 'border border-muted-foreground/60 bg-transparent',
}

export function StatusDot({ status, className }: { status: MatchStatus; className?: string }) {
  return <span className={cn('inline-block size-2 shrink-0 rounded-full', STATUS_DOT[status], className)} aria-hidden />
}

export function StatusBadge({ status, className, withHint }: { status: MatchStatus; className?: string; withHint?: boolean }) {
  const badge = (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        STATUS_STYLE[status],
        className,
      )}
    >
      <StatusDot status={status} className="size-1.5" />
      {STATUS_LABEL[status]}
    </span>
  )
  if (!withHint) return badge
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{STATUS_HINT[status]}</TooltipContent>
    </Tooltip>
  )
}

/** Monospace ascend ID with click-to-copy. */
export function IdChip({ value, label, className }: { value: string; label: string; className?: string }) {
  const [done, setDone] = useState(false)
  if (!value) return <span className="text-muted-foreground/50">—</span>
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        if (await copyText(value)) {
          setDone(true)
          toast.success(`${label} ${value} copied`)
          setTimeout(() => setDone(false), 1200)
        }
      }}
      className={cn(
        'group/id inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[0.8rem] tabular tracking-tight text-foreground/90 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
      aria-label={`Copy ${label} ${value}`}
      title={`Copy ${label}`}
    >
      {value}
      {done ? (
        <Check className="size-3 text-success" />
      ) : (
        <Copy className="size-3 opacity-0 transition-opacity group-hover/id:opacity-60" />
      )}
    </button>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-mono text-[0.68rem] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Monogram({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid size-7 place-items-center rounded-md bg-brand font-heading text-lg leading-none font-semibold text-brand-foreground italic shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)]',
        className,
      )}
      aria-hidden
    >
      N
    </span>
  )
}

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s'-]/gu, '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Avatar({ name, status, className }: { name: string; status?: MatchStatus; className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[0.7rem] font-semibold tracking-wide text-secondary-foreground ring-1 ring-border',
        className,
      )}
      aria-hidden
    >
      {initials(name)}
      {status && <StatusDot status={status} className="absolute -right-0.5 -bottom-0.5 size-2.5 ring-2 ring-background" />}
    </span>
  )
}
