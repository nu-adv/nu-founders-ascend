import { ArrowDownNarrowWide, ArrowUpNarrowWide, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLUMNS, DEFAULT_LIST_COLUMNS } from '@/lib/columns'
import { useStore, type Density, type GroupBy } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Segmented, SectionLabel } from '@/components/kit/primitives'

const SORTABLE = ['name', 'last', 'company', 'funding', 'staff', 'northeastern', 'sector', 'hq', 'tier', 'constituentId', 'status']

export function DisplayMenu() {
  const { groupBy, setGroupBy, sort, setSort, listColumns, setListColumns, density, setDensity } = useStore()
  const listable = COLUMNS.filter((c) => c.inList && c.id !== 'name')
  const groups = [...new Set(listable.map((c) => c.group))]
  const toggleCol = (id: string) => {
    // keep the user's own order; new columns go to the end
    setListColumns(listColumns.includes(id) ? listColumns.filter((x) => x !== id) : [...listColumns, id])
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-[0.6rem] px-2.5 text-xs">
          <SlidersHorizontal className="size-3.5" />
          <span className="max-sm:hidden">Display</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[320px] gap-0 p-0">
        <div className="space-y-4 border-b p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">Group by</span>
            <Segmented<GroupBy>
              id="groupby"
              size="sm"
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'status', label: 'Status' },
                { value: 'source', label: 'Source' },
                { value: 'tier', label: 'Tier' },
                { value: 'none', label: 'None' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">Density</span>
            <Segmented<Density>
              id="density"
              size="sm"
              value={density}
              onChange={setDensity}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">Order by</span>
            <div className="flex items-center gap-1">
              <Select value={sort.column} onValueChange={(v) => setSort({ column: v, dir: sort.dir })}>
                <SelectTrigger size="sm" className="h-7 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTABLE.map((id) => (
                    <SelectItem key={id} value={id} className="text-xs">
                      {COLUMNS.find((c) => c.id === id)?.label ?? id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                onClick={() => setSort({ column: sort.column, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
                aria-label={sort.dir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sort.dir === 'asc' ? <ArrowUpNarrowWide /> : <ArrowDownNarrowWide />}
              </Button>
            </div>
          </div>
        </div>
        <div className="scrollbar-thin max-h-[min(50vh,380px)] space-y-3 overflow-y-auto p-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Columns <span className="font-normal tracking-normal normal-case text-muted-foreground/70">· drag headers to reorder</span></SectionLabel>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setListColumns(DEFAULT_LIST_COLUMNS)}>
              Reset
            </button>
          </div>
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1 px-1 text-[0.625rem] text-muted-foreground/70">{g}</div>
              <div className="grid grid-cols-2 gap-x-1">
                {listable
                  .filter((c) => c.group === g)
                  .map((c) => {
                    const on = listColumns.includes(c.id)
                    return (
                      <label key={c.id} className={cn('flex h-7 cursor-pointer items-center gap-2 rounded-md px-1.5 text-xs select-none hover:bg-accent', on && 'text-foreground')}>
                        <Checkbox checked={on} onCheckedChange={() => toggleCol(c.id)} className="size-3.5" aria-label={c.label} />
                        <span className="truncate">{c.label}</span>
                      </label>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
