import writeXlsxFile from 'write-excel-file/browser'
import type { Row, Sheet } from 'write-excel-file/browser'
import { CATEGORY_LABEL, COLUMN_BY_ID, type ColumnDef } from '@/lib/columns'
import type { Category, Decisions, Founder } from '@/lib/types'

export type ExportFormat = 'xlsx' | 'csv'

export interface ExportOptions {
  rows: Founder[]
  columnIds: string[]
  format: ExportFormat
  fileName: string
  splitByCategory: boolean
  decisions: Decisions
}

const CATEGORY_ORDER: Category[] = ['in_ascend', 'review', 'not_found']
const HEADER_FILL = '#C8102E' // Northeastern red
const HEADER_TEXT = '#FFFFFF'

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
  return cleaned || 'NEU Founders - ascend'
}

function resolveColumns(columnIds: string[]): ColumnDef[] {
  const cols = columnIds.map((id) => COLUMN_BY_ID[id]).filter((c): c is ColumnDef => !!c)
  if (!cols.length) throw new Error('Choose at least one column to export.')
  return cols
}

function cellText(col: ColumnDef, f: Founder, decisions: Decisions): string {
  return col.value(f, decisions[f.id]) ?? ''
}

function buildSheet(name: string, rows: Founder[], cols: ColumnDef[], decisions: Decisions): Sheet<Blob> {
  const header: Row = cols.map((c) => ({
    value: c.label,
    type: String,
    fontWeight: 'bold',
    backgroundColor: HEADER_FILL,
    textColor: HEADER_TEXT,
    alignVertical: 'center',
  }))
  // Every value is written as text so ascend IDs keep their leading zeros.
  const body: Row[] = rows.map((f) =>
    cols.map((c) => {
      const v = cellText(c, f, decisions)
      return v ? { value: v, type: String } : null
    }),
  )
  return {
    sheet: name.slice(0, 31),
    data: [header, ...body],
    columns: cols.map((c) => ({ width: c.xlsxWidth })),
    stickyRowsCount: 1,
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function csvEscape(v: string): string {
  return /[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function buildCsv(rows: Founder[], cols: ColumnDef[], decisions: Decisions): string {
  const lines = [cols.map((c) => csvEscape(c.label)).join(',')]
  for (const f of rows) lines.push(cols.map((c) => csvEscape(cellText(c, f, decisions))).join(','))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Builds the file in the browser and starts the download. Returns the file name used. */
export async function exportFounders(opts: ExportOptions): Promise<string> {
  const cols = resolveColumns(opts.columnIds)
  const base = safeFileName(opts.fileName.replace(/\.(xlsx|csv)$/i, ''))

  if (opts.format === 'csv') {
    const name = `${base}.csv`
    downloadBlob(new Blob([buildCsv(opts.rows, cols, opts.decisions)], { type: 'text/csv;charset=utf-8' }), name)
    return name
  }

  let sheets: Sheet<Blob>[]
  if (opts.splitByCategory) {
    sheets = CATEGORY_ORDER.map((cat) => ({ cat, rows: opts.rows.filter((f) => f.category === cat) }))
      .filter((g) => g.rows.length)
      .map((g) => buildSheet(CATEGORY_LABEL[g.cat], g.rows, cols, opts.decisions))
    if (!sheets.length) sheets = [buildSheet('Founders', [], cols, opts.decisions)]
  } else {
    sheets = [buildSheet('Founders', opts.rows, cols, opts.decisions)]
  }

  const name = `${base}.xlsx`
  const blob = await writeXlsxFile(sheets, { fontFamily: 'Arial', fontSize: 11 }).toBlob()
  downloadBlob(blob, name)
  return name
}
