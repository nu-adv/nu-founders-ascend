import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Download, FileSpreadsheet, FileText, Loader2, Rows3, SquareCheck, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Segmented, SectionLabel } from '@/components/kit/primitives'
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
    { id: 'view', label: 'Current view', count: filteredRows.length, icon: Rows3, hint: 'Matching your filters' },
    ...(selectedRows.length ? [{ id: 'selected' as Scope, label: 'Selected', count: selectedRows.length, icon: SquareCheck, hint: 'Rows you ticked' }] : []),
    { id: 'all', label: 'Everything', count: allRows.length, icon: Users, hint: 'All founders' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden rounded-2xl border bg-surface p-0 shadow-[var(--shadow-float)] ring-0 sm:max-w-[40rem]">
        <DialogHeader className="flex-row items-start gap-3 border-b px-5 pt-5 pb-4 text-left">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.65rem] border bg-muted/60">
            <FileSpreadsheet className="size-4 text-foreground/80" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <DialogTitle className="text-base font-semibold tracking-tight">Export</DialogTitle>
            <DialogDescription className="text-[0.8125rem]">
              Choose rows and columns. The file is built in your browser — nothing is uploaded.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="scrollbar-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Rows */}
          <section className="space-y-2">
            <SectionLabel>Rows</SectionLabel>
            <div role="radiogroup" aria-label="Rows to export" className={cn("grid gap-2", scopes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
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
                      'relative flex flex-col items-start gap-0.5 rounded-xl border bg-card px-3 py-2.5 text-left shadow-[var(--shadow-hairline)] transition-[background-color,border-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45',
                      active ? 'border-foreground/25 bg-accent/70 ring-1 ring-foreground/10' : 'hover:bg-accent/50',
                    )}
                  >
                    <span className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <s.icon className="size-3.5" />
                      {s.label}
                      <span
                        className={cn(
                          'ml-auto grid size-4 place-items-center rounded-full border transition-colors',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
                        )}
                      >
                        {active && <Check className="size-2.5" strokeWidth={3} />}
                      </span>
                    </span>
                    <span className="text-xl font-semibold tracking-tight tabular">{s.count.toLocaleString()}</span>
                    <span className="text-[0.625rem] text-muted-foreground">{s.hint}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Format */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SectionLabel>Format</SectionLabel>
              <Segmented<ExportFormat>
                id="export-format"
                value={format}
                onChange={setFormat}
                options={[
                  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, title: 'Excel workbook (.xlsx)' },
                  { value: 'csv', label: 'CSV', icon: FileText, title: 'Comma-separated values (.csv)' },
                ]}
              />
            </div>
            <div className={cn('flex items-center gap-2', format !== 'xlsx' && 'opacity-45')}>
              <Switch id="split" size="sm" checked={split && format === 'xlsx'} onCheckedChange={setSplit} disabled={format !== 'xlsx'} />
              <Label htmlFor="split" className="text-[0.8125rem] font-normal">
                One sheet per category
              </Label>
            </div>
          </section>

          {/* Columns */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel>Columns</SectionLabel>
              <span className="text-xs text-muted-foreground tabular">
                {orderedIds.length} of {COLUMNS.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_PRESETS.map((p) => {
                const on = activePreset === p.id
                return (
                  <Button
                    key={p.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={on}
                    onClick={() => setChosen(new Set(p.columns))}
                    title={p.description}
                    className={cn('h-7 rounded-full px-3 text-xs', on && 'border-foreground/30 bg-accent text-foreground')}
                  >
                    {on && <Check className="size-3" />}
                    {p.label}
                  </Button>
                )
              })}
              <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full px-3 text-xs text-muted-foreground" onClick={() => setChosen(new Set())}>
                Clear
              </Button>
            </div>
            <div className="scrollbar-thin max-h-[min(42svh,22rem)] overflow-y-auto rounded-xl border bg-card">
              {groups.map(({ group, cols }) => {
                const ids = cols.map((c) => c.id)
                const n = ids.filter((id) => chosen.has(id)).length
                return (
                  <div key={group} className="border-b px-3.5 py-3 last:border-b-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <SectionLabel className="flex items-center gap-1.5">
                        {GROUP_LABEL[group]}
                        <span className="font-medium tracking-normal normal-case tabular">
                          {n}/{ids.length}
                        </span>
                      </SectionLabel>
                      <div className="flex gap-0.5">
                        <Button type="button" size="xs" variant="ghost" className="h-6 px-1.5 text-[0.625rem]" onClick={() => setGroup(ids, true)} disabled={n === ids.length}>
                          All
                        </Button>
                        <Button type="button" size="xs" variant="ghost" className="h-6 px-1.5 text-[0.625rem]" onClick={() => setGroup(ids, false)} disabled={n === 0}>
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                      {cols.map((c) => (
                        <label
                          key={c.id}
                          htmlFor={`col-${c.id}`}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[0.8125rem] transition-colors hover:bg-accent/60"
                        >
                          <Checkbox id={`col-${c.id}`} checked={chosen.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                          <span className="truncate">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* File name */}
          <section className="space-y-2">
            <Label htmlFor="export-name" className="text-[0.625rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              File name
            </Label>
            <div className="flex items-center rounded-lg border bg-background pr-3 shadow-[var(--shadow-hairline)] focus-within:ring-2 focus-within:ring-ring">
              <Input
                id="export-name"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="h-9 border-0 bg-transparent text-[0.8125rem] shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <span className="text-[0.8125rem] text-muted-foreground">.{format}</span>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-3 border-t bg-muted/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground tabular">
            <span className="font-medium text-foreground">{rows.length.toLocaleString()}</span> rows ×{' '}
            <span className="font-medium text-foreground">{orderedIds.length}</span> columns
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" onClick={run} disabled={busy || !orderedIds.length || !rows.length}>
              {busy ? <Loader2 className="animate-spin" /> : <Download />}
              {busy ? 'Building…' : `Export ${format === 'xlsx' ? 'Excel' : 'CSV'}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
