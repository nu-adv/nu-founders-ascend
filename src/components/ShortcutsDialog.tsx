import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd, SectionLabel } from '@/components/kit/primitives'

type Row = { keys: string[][]; label: string }

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

/** keys: outer array = alternatives ("or"), inner array = sequence/chord shown side by side. */
const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'General',
    rows: [
      { keys: [[MOD, 'K']], label: 'Command menu' },
      { keys: [['/']], label: 'Search founders' },
      { keys: [['E']], label: 'Export to Excel' },
      { keys: [['?']], label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'List',
    rows: [
      { keys: [['J'], ['↓']], label: 'Next founder' },
      { keys: [['K'], ['↑']], label: 'Previous founder' },
      { keys: [['↵']], label: 'Open details' },
      { keys: [['Esc']], label: 'Close details / clear search' },
    ],
  },
  {
    title: 'Navigate',
    rows: [
      { keys: [['[']], label: 'Show or hide the sidebar' },
      { keys: [['G', 'O']], label: 'Go to Overview' },
      { keys: [['G', 'F']], label: 'Go to Founders' },
      { keys: [['1'], ['2'], ['3'], ['4']], label: 'All · In ascend · Needs review · Not in ascend' },
    ],
  },
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl border bg-surface p-0 shadow-[var(--shadow-float)] ring-0 sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 border-b px-5 py-4 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] border bg-muted/60">
            <Keyboard className="size-4 text-foreground/80" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <DialogTitle className="text-base font-semibold tracking-tight">Keyboard shortcuts</DialogTitle>
            <DialogDescription className="text-[0.8125rem]">Move through founders without the mouse.</DialogDescription>
          </div>
        </DialogHeader>
        <div className="scrollbar-thin max-h-[70svh] space-y-4 overflow-y-auto px-5 py-4">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <SectionLabel className="mb-1">{g.title}</SectionLabel>
              <ul>
                {g.rows.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-4 border-b border-border/60 py-2 text-[0.8125rem] last:border-b-0">
                    <span className="text-foreground/85">{r.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {r.keys.map((combo, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="px-0.5 text-[0.625rem] text-muted-foreground">{r.keys.length > 2 ? '' : 'or'}</span>}
                          {combo.map((k, j) => (
                            <span key={k + j} className="flex items-center gap-1">
                              {j > 0 && combo[0] === 'G' && <span className="text-[0.625rem] text-muted-foreground">then</span>}
                              <Kbd>{k}</Kbd>
                            </span>
                          ))}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
