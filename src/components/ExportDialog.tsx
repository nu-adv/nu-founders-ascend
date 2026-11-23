import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Download, FileSpreadsheet, FileText, Loader2, Rows3, SquareCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { COLUMNS, EXPORT_PRESETS, type ColumnGroup } from '@/lib/columns'
import { exportFounders, type ExportFormat } from '@/lib/exporter'
import type { Decisions, Founder } from '@/lib/types'

type Scope = 'view' | 'selected' | 'all'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  filteredRows: Founder[]
  selectedRows: Founder[]
  allRows: Founder[]
  decisions: Decisions
}

const PREFS_KEY = 'nfa.export'
const GROUP_ORDER: ColumnGroup[] = ['Person', 'ascend', 'Company', 'Northeastern', 'Sources', 'Review']
const GROUP_LABEL: Record<ColumnGroup, string> = {
  Person: 'Person & contact',
  ascend: 'ascend match',
  Company: 'Company & role',
  Northeastern: 'Northeastern',
  Sources: 'Sources',
  Review: 'Your review',
}
const ALL_IDS = new Set(COLUMNS.map((c) => c.id))
const DEFAULT_COLUMNS = EXPORT_PRESETS[0].columns

interface Prefs {
  columns: string[]
  format: ExportFormat
  split: boolean
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>
      const columns = (p.columns ?? []).filter((id) => ALL_IDS.has(id))
      return {
        columns: columns.length ? columns : DEFAULT_COLUMNS,
        format: p.format === 'csv' ? 'csv' : 'xlsx',
        split: !!p.split,
      }
    }
  } catch {
    /* ignore */
  }
  return { columns: DEFAULT_COLUMNS, format: 'xlsx', split: false }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

export function ExportDialog({ open, onOpenChange, filteredRows, selectedRows, allRows, decisions }: ExportDialogProps) {
  const [prefs] = useState(loadPrefs)
  const [scope, setScope] = useState<Scope>('view')
  const [format, setFormat] = useState<ExportFormat>(prefs.format)
  const [split, setSplit] = useState(prefs.split)
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(prefs.columns))
  const [fileName, setFileName] = useState(() => `NEU Founders - ascend ${today()}`)
  const [busy, setBusy] = useState(false)

  // Each time the dialog opens: default to the selection if there is one, and refresh the dated file name.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setScope(selectedRows.length ? 'selected' : 'view')
      setFileName(`NEU Founders - ascend ${today()}`)
    }
  }

  const rows = scope === 'selected' ? selectedRows : scope === 'all' ? allRows : filteredRows
  const orderedIds = useMemo(() => COLUMNS.filter((c) => chosen.has(c.id)).map((c) => c.id), [chosen])
  const groups = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, cols: COLUMNS.filter((c) => c.group === g) })).filter((g) => g.cols.length),
    [],
  )
  const activePreset = EXPORT_PRESETS.find(
    (p) => p.columns.length === orderedIds.length && p.columns.every((id) => chosen.has(id)),
  )?.id

  function toggle(id: string, on: boolean) {
    setChosen((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setGroup(ids: string[], on: boolean) {
    setChosen((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  async function run() {
    if (!orderedIds.length || !rows.length || busy) return
    setBusy(true)
    try {
      // let the button paint its busy state before the (synchronous) workbook build
      await new Promise((r) => setTimeout(r, 30))
      const name = await exportFounders({
        rows,
        columnIds: orderedIds,
        format,
        fileName,
        splitByCategory: format === 'xlsx' && split,
        decisions,
      })
      savePrefs({ columns: orderedIds, format, split })
      toast.success(`Exported ${rows.length.toLocaleString()} founders`, { description: name })
      onOpenChange(false)
    } catch (err) {
      toast.error('Export failed', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
    }
  }

  const scopes: { id: Scope; label: string; count: number; icon: typeof Rows3; hint: string }[] = [
    { id: 'view', label: 'Current view', count: filteredRows.length, icon: Rows3, hint: 'Rows matching your filters' },
    { id: 'selected', label: 'Selected rows', count: selectedRows.length, icon: SquareCheck, hint: 'Rows you ticked' },
    { id: 'all', label: 'Everything', count: allRows.length, icon: Users, hint: 'All founders' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 font-heading text-2xl font-medium tracking-tight">
            <FileSpreadsheet className="size-5 text-primary" /> Export to Excel
          </DialogTitle>
          <DialogDescription>Pick the rows and the columns you want. The file is built in your browser.</DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Rows */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Rows</h3>
            <div role="radiogroup" aria-label="Rows to export" className="grid gap-2 sm:grid-cols-3">
              {scopes.map((s) => {
                const disabled = s.count === 0
                const active = scope === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${s.label}: ${s.count.toLocaleString()} rows`}
                    disabled={disabled}
                    onClick={() => setScope(s.id)}
                    className={cn(
                      'group relative flex flex-col items-start gap-1 rounded-lg border bg-card px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-45',
                      active ? 'border-primary bg-primary/[0.06] ring-1 ring-primary/40' : 'hover:bg-muted/60',
                    )}
                  >
                    <span className="flex w-full items-center gap-2 text-sm font-medium">
                      <s.icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
                      {s.label}
                      {active && <Check className="ml-auto size-4 text-primary" />}
                    </span>
                    <span className="font-mono text-xl tabular">{s.count.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{s.hint}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Format */}
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Format</h3>
              <ToggleGroup
                type="single"
                variant="outline"
                value={format}
                onValueChange={(v) => v && setFormat(v as ExportFormat)}
                aria-label="File format"
              >
                <ToggleGroupItem value="xlsx" className="gap-1.5 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-primary">
                  <FileSpreadsheet className="size-4" /> Excel (.xlsx)
                </ToggleGroupItem>
                <ToggleGroupItem value="csv" className="gap-1.5 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary aria-checked:border-primary aria-checked:bg-primary/10 aria-checked:text-primary">
                  <FileText className="size-4" /> CSV
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className={cn('flex items-center gap-2.5 pb-1.5', format !== 'xlsx' && 'opacity-45')}>
              <Switch id="split" checked={split && format === 'xlsx'} onCheckedChange={setSplit} disabled={format !== 'xlsx'} />
              <Label htmlFor="split" className="font-normal">
                One sheet per category
              </Label>
            </div>
          </section>

          {/* Columns */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Columns</h3>
              <span className="text-xs text-muted-foreground tabular">
                {orderedIds.length} of {COLUMNS.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXPORT_PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={activePreset === p.id ? 'default' : 'outline'}
                  onClick={() => setChosen(new Set(p.columns))}
                  title={p.description}
                >
                  {p.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => setChosen(new Set())}>
                Clear
              </Button>
            </div>
            <div className="divide-y rounded-lg border bg-card">
              {groups.map(({ group, cols }) => {
                const ids = cols.map((c) => c.id)
                const n = ids.filter((id) => chosen.has(id)).length
                return (
                  <div key={group} className="px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {GROUP_LABEL[group]}{' '}
                        <span className="font-normal text-muted-foreground tabular">
                          {n}/{ids.length}
                        </span>
                      </p>
                      <div className="flex gap-1">
                        <Button type="button" size="xs" variant="ghost" onClick={() => setGroup(ids, true)} disabled={n === ids.length}>
                          All
                        </Button>
                        <Button type="button" size="xs" variant="ghost" onClick={() => setGroup(ids, false)} disabled={n === 0}>
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                      {cols.map((c) => (
                        <div key={c.id} className="flex items-center gap-2.5">
                          <Checkbox id={`col-${c.id}`} checked={chosen.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                          <Label htmlFor={`col-${c.id}`} className="truncate font-normal">
                            {c.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* File name */}
          <section className="space-y-2">
            <Label htmlFor="export-name" className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              File name
            </Label>
            <div className="flex items-center rounded-lg border bg-card pr-3 focus-within:ring-3 focus-within:ring-ring/50">
              <Input
                id="export-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <span className="font-mono text-sm text-muted-foreground">.{format}</span>
            </div>
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 items-center gap-3 px-5 py-3.5 sm:justify-between">
          <p className="text-xs text-muted-foreground tabular">
            {rows.length.toLocaleString()} rows × {orderedIds.length} columns
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={run} disabled={busy || !orderedIds.length || !rows.length}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {busy ? 'Building…' : `Export ${format === 'xlsx' ? 'Excel' : 'CSV'}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
