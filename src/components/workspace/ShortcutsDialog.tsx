import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd } from './bits'

const SHORTCUTS: [string[], string][] = [
  [['/'], 'Search'],
  [['J', '↓'], 'Next founder'],
  [['K', '↑'], 'Previous founder'],
  [['↵'], 'Open details'],
  [['Esc'], 'Close details / clear search'],
  [['X'], 'Select / unselect (Shift for a range)'],
  [['1', '–', '4'], 'All · In ascend · Needs review · Not in ascend'],
  [['F'], 'Show or hide filters'],
  [['E'], 'Export to Excel'],
  [['?'], 'This list'],
]

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-medium">Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move through the list without the mouse.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between py-2 text-sm">
              <span className="text-foreground/85">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map((k) => (k === '–' ? <span key={k} className="text-muted-foreground">–</span> : <Kbd key={k}>{k}</Kbd>))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
