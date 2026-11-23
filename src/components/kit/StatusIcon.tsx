import { cn } from '@/lib/utils'
import type { MatchStatus } from '@/lib/types'

/** Ring glyphs in the spirit of issue-tracker status icons: the fill tells you how sure the match is. */
const TONE: Record<MatchStatus, string> = {
  CONFIRMED: 'text-success',
  PROBABLE: 'text-warning',
  POSSIBLE: 'text-warning',
  AMBIGUOUS: 'text-info',
  UNVERIFIED: 'text-muted-foreground/70',
  'NOT CHECKED': 'text-muted-foreground/60',
  'NOT FOUND': 'text-muted-foreground/55',
}

export function StatusIcon({ status, className }: { status: MatchStatus; className?: string }) {
  const tone = TONE[status]
  const common = { cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }
  return (
    <svg viewBox="0 0 16 16" className={cn('size-4 shrink-0', tone, className)} aria-hidden>
      {status === 'CONFIRMED' && (
        <>
          <circle cx={8} cy={8} r={7} fill="currentColor" />
          <path d="M5.1 8.3l1.9 1.9 3.9-4" fill="none" stroke="var(--surface)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === 'PROBABLE' && (
        <>
          <circle {...common} />
          <path d="M8 3.6 A4.4 4.4 0 1 1 3.6 8 L8 8 Z" fill="currentColor" />
        </>
      )}
      {status === 'POSSIBLE' && (
        <>
          <circle {...common} />
          <path d="M8 3.6 A4.4 4.4 0 0 1 12.4 8 L8 8 Z" fill="currentColor" />
        </>
      )}
      {status === 'AMBIGUOUS' && (
        <>
          <circle {...common} />
          <circle cx={8} cy={8} r={2.2} fill="currentColor" />
        </>
      )}
      {(status === 'UNVERIFIED' || status === 'NOT CHECKED') && <circle {...common} strokeDasharray="2.4 2.2" />}
      {status === 'NOT FOUND' && (
        <>
          <circle {...common} />
          <path d="M5.6 10.4l4.8-4.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}
