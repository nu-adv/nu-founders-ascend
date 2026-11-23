import { useState, type ComponentProps, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { copyText } from '@/lib/prefs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { spring } from './motion'

/* ───────────── Chips & badges ───────────── */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger'

const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/50',
  brand: 'bg-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  danger: 'bg-danger',
}

/** Outlined pill with an optional colour dot — the "feature / bug" chip. */
export function Chip({ tone = 'neutral', dot = true, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-full border bg-background px-1.5 text-[0.625rem] font-medium whitespace-nowrap text-muted-foreground',
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOT[tone])} />}
      {children}
    </span>
  )
}

const BADGE: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand/10 text-brand',
  success: 'bg-success/12 text-success-ink',
  warning: 'bg-warning/14 text-warning-ink',
  info: 'bg-info/12 text-info-ink',
  danger: 'bg-danger/10 text-destructive',
}

/** Tinted count pill ("6 late"). */
export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-medium tabular', BADGE[tone], className)}>
      {children}
    </span>
  )
}

/* ───────────── Avatar ───────────── */

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s'-]/gu, '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

const AVATAR_SIZE = { xs: 'size-5 text-[0.5625rem]', sm: 'size-6 text-[0.6rem]', md: 'size-8 text-[0.7rem]', lg: 'size-11 text-sm' }

export function Avatar({ name, size = 'sm', className }: { name: string; size?: keyof typeof AVATAR_SIZE; className?: string }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/[0.07] font-semibold tracking-wide text-foreground/75 ring-1 ring-border/60 dark:bg-white/[0.06]',
        AVATAR_SIZE[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/* ───────────── Keyboard hint ───────────── */

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border bg-muted/70 px-1 font-sans text-[0.625rem] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/* ───────────── Icon button with tooltip ───────────── */

export function IconButton({
  label,
  shortcut,
  children,
  className,
  variant = 'ghost',
  ...props
}: { label: string; shortcut?: string; variant?: 'ghost' | 'outline' } & Omit<ComponentProps<typeof Button>, 'variant'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          aria-label={label}
          className={cn('size-[34px] rounded-[0.6rem] text-muted-foreground hover:text-foreground', className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut && <Kbd className="border-white/20 bg-white/10 text-current">{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

/* ───────────── Surfaces ───────────── */

/** The floating white workspace panel. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-panel)]', className)}>
      {children}
    </section>
  )
}

export function PanelHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <header className={cn('flex h-14 shrink-0 items-center gap-3 border-b px-4', className)}>{children}</header>
}

/** Dashboard-style card: hairline border, whisper shadow. */
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & ComponentProps<'div'>) {
  return (
    <div className={cn('relative flex flex-col overflow-clip rounded-xl border border-border/70 bg-card shadow-[var(--shadow-hairline)]', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ icon: Icon, title, action, className }: { icon?: typeof Copy; title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-4 pt-3.5 pb-2', className)}>
      {Icon && <Icon className="size-4 text-muted-foreground" />}
      <h3 className="truncate text-[0.8125rem] font-medium">{title}</h3>
      {action && <div className="ml-auto flex items-center gap-1">{action}</div>}
    </div>
  )
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-[0.625rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase', className)}>{children}</div>
}

/* ───────────── Segmented control (animated) ───────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  size = 'md',
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: typeof Copy; title?: string }[]
  id: string
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div role="radiogroup" className={cn('relative inline-flex items-center gap-0.5 rounded-[0.65rem] bg-muted p-0.5', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-0 inline-flex items-center gap-1.5 rounded-[0.5rem] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs',
              on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-[0.5rem] bg-background shadow-[var(--shadow-panel)] dark:bg-accent"
              />
            )}
            {o.icon && <o.icon className="size-3.5" />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────── Data viz ───────────── */

export function ProgressBar({ value, max, tone = 'brand', className, delay = 0 }: { value: number; max: number; tone?: Tone; className?: string; delay?: number }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const fill: Record<Tone, string> = {
    neutral: 'bg-muted-foreground/40',
    brand: 'bg-brand/75',
    success: 'bg-success/80',
    warning: 'bg-warning/80',
    info: 'bg-info/80',
    danger: 'bg-danger/80',
  }
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full origin-left animate-grow-x rounded-full', fill[tone])}
        style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  )
}

/** Animated SVG donut. Segments draw in sequence. */
export function Donut({
  segments,
  size = 132,
  thickness = 14,
  center,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  thickness?: number
  center?: ReactNode
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0
  const arcs = segments.reduce<{ s: (typeof segments)[number]; len: number; start: number }[]>((acc, seg) => {
    const start = acc.length ? acc[acc.length - 1].start + (acc[acc.length - 1].s.value / total) * c : 0
    acc.push({ s: seg, len: Math.max(0, (seg.value / total) * c - gap), start })
    return acc
  }, [])
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
        {arcs.map(({ s, len, start }, i) => (
          <motion.circle
            key={s.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
            strokeDashoffset={-start}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${len} ${c}` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 * i }}
          />
        ))}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  )
}

/* ───────────── Copyable ID ───────────── */

export function CopyId({ value, label, className, size = 'sm' }: { value: string; label: string; className?: string; size?: 'sm' | 'lg' }) {
  const [done, setDone] = useState(false)
  if (!value) return <span className="text-muted-foreground/40">—</span>
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        if (await copyText(value)) {
          setDone(true)
          toast.success(`${label} copied`, { description: value })
          setTimeout(() => setDone(false), 1400)
        }
      }}
      className={cn(
        'group/id -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 tabular transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        size === 'lg' ? 'py-0.5 text-[1.05rem] font-semibold tracking-tight text-foreground' : 'py-px text-xs text-muted-foreground hover:text-foreground',
        className,
      )}
      aria-label={`Copy ${label} ${value}`}
    >
      {value}
      {done ? <Check className="size-3 text-success-ink" /> : <Copy className="size-3 opacity-0 transition-opacity group-hover/id:opacity-70" />}
    </button>
  )
}

/* ───────────── Empty state ───────────── */

export function EmptyState({ icon: Icon, title, body, action }: { icon: typeof Copy; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="grid flex-1 place-items-center p-10">
      <div className="max-w-xs animate-rise text-center">
        <div className="mx-auto mb-3 grid size-10 place-items-center rounded-xl border bg-muted/60">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{title}</p>
        {body && <p className="mt-1 text-[0.8125rem] text-muted-foreground">{body}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

/** Brand mark: the red tile used in the sidebar and login. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-[0.55rem] bg-brand text-[0.95rem] font-bold tracking-tight text-brand-foreground shadow-[inset_0_-1px_0_rgb(0_0_0/0.18),0_1px_2px_rgb(0_0_0/0.12)]',
        className,
      )}
      aria-hidden
    >
      N
    </span>
  )
}
