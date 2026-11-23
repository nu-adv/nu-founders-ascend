import { useState } from 'react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from '@/lib/columns'
import { useStore } from '@/lib/store'
import type { Founder } from '@/lib/types'
import { initials } from '@/components/kit/primitives'
import { StatusIcon } from '@/components/kit/StatusIcon'

const AV = { xs: 'size-5 text-[0.55rem]', sm: 'size-7 text-[0.62rem]', md: 'size-8 text-[0.68rem]', lg: 'size-14 text-base' } as const
const BADGE = { xs: 'size-2.5', sm: 'size-3', md: 'size-3.5', lg: 'size-4.5' } as const

/** Founder photo (from the founders site) or initials, with the match status as a corner badge. */
export function FounderAvatar({ founder: f, size = 'md', status = true, className }: { founder: Founder; size?: keyof typeof AV; status?: boolean; className?: string }) {
  const { media } = useStore()
  const src = f.photo ? media[f.photo] : undefined
  const [broken, setBroken] = useState(false)
  return (
    <span className={cn('relative inline-grid shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-full font-semibold tracking-wide text-foreground/70 ring-1 ring-border/70',
          src && !broken ? 'bg-muted' : 'bg-[color-mix(in_oklch,var(--muted)_70%,var(--surface))]',
          AV[size],
        )}
      >
        {src && !broken ? (
          <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} className="size-full animate-[rise_0.35s_ease-out] object-cover" />
        ) : (
          initials(f.name)
        )}
      </span>
      {status && (
        <span
          className={cn('absolute -right-0.5 -bottom-0.5 grid place-items-center rounded-full bg-surface ring-2 ring-surface', BADGE[size])}
          title={STATUS_LABEL[f.status]}
        >
          <StatusIcon status={f.status} className="size-full" />
        </span>
      )}
    </span>
  )
}

const LOGO = { xs: 'size-4 rounded-[0.25rem] text-[0.5rem]', sm: 'size-5 rounded-[0.3rem] text-[0.55rem]', md: 'size-7 rounded-[0.45rem] text-[0.7rem]', lg: 'size-9 rounded-[0.55rem] text-xs' } as const

function hueOf(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

/** Company logo on a white tile; a tinted initial when we don't have one. */
export function CompanyLogo({ founder: f, size = 'md', className }: { founder: Founder; size?: keyof typeof LOGO; className?: string }) {
  const { media } = useStore()
  const src = f.logo ? media[f.logo] : undefined
  const [broken, setBroken] = useState(false)
  const name = f.company || f.domain || '?'
  if (src && !broken) {
    return (
      <span className={cn('grid shrink-0 place-items-center overflow-hidden bg-white ring-1 ring-black/[0.07] dark:ring-white/10', LOGO[size], className)}>
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setBroken(true)} className="size-full object-contain" />
      </span>
    )
  }
  const hue = hueOf(name)
  return (
    <span
      className={cn('grid shrink-0 place-items-center font-semibold ring-1 ring-black/[0.05] dark:ring-white/10', LOGO[size], className)}
      style={{ background: `oklch(0.94 0.035 ${hue})`, color: `oklch(0.42 0.09 ${hue})` }}
      aria-hidden
    >
      {name.replace(/^(the|a)\s+/i, '').charAt(0).toUpperCase()}
    </span>
  )
}
