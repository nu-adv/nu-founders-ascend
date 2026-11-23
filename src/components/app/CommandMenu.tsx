import { useMemo, useState } from 'react'
import { Download, Keyboard, LayoutGrid, Lock, Moon, Sun, Users } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useStore } from '@/lib/store'
import { buildSearchIndex } from '@/lib/query'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import { StatusIcon } from '@/components/kit/StatusIcon'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function CommandMenu() {
  const { founders, ui, setUi, go, open, lock, counts } = useStore()
  const { resolvedTheme, setTheme } = useTheme()
  const [q, setQ] = useState('')
  const index = useMemo(() => buildSearchIndex(founders), [founders])

  const people = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    const hits: typeof founders = []
    for (const f of founders) {
      const hay = index.get(f.id) ?? ''
      if (terms.every((t) => hay.includes(t))) {
        hits.push(f)
        if (hits.length >= 40) break
      }
    }
    // names that start with the query first
    const t0 = terms[0]
    return hits.sort((a, b) => Number(!norm(a.name).startsWith(t0)) - Number(!norm(b.name).startsWith(t0)))
  }, [q, founders, index])

  const close = () => {
    setUi({ commandOpen: false })
    setQ('')
  }
  const run = (fn: () => void) => () => {
    close()
    fn()
  }
  const matchQ = (label: string) => !q || norm(label).includes(norm(q))

  return (
    <CommandDialog
      open={ui.commandOpen}
      onOpenChange={(o) => (o ? setUi({ commandOpen: true }) : close())}
      title="Search founders"
      description="Jump to a founder, view or action"
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput value={q} onValueChange={setQ} placeholder="Search founders, companies, emails, ascend IDs…" />
        <CommandList className="max-h-[min(60vh,440px)]">
          <CommandEmpty>No matches.</CommandEmpty>
          {people.length > 0 && (
            <CommandGroup heading={`Founders · ${people.length}${people.length === 40 ? '+' : ''}`}>
              {people.map((f) => (
                <CommandItem key={f.id} value={f.id} onSelect={run(() => open(f.id))} className="gap-2.5">
                  <StatusIcon status={f.status} className="size-3.5" />
                  <span className="truncate">{f.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{f.company}</span>
                  {f.ascend?.constituentId && <CommandShortcut className="tabular">{f.ascend.constituentId}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {people.length > 0 && <CommandSeparator />}
          <CommandGroup heading="Go to">
            {matchQ('Overview dashboard') && (
              <CommandItem value="go-overview" onSelect={run(() => go('overview'))}>
                <LayoutGrid /> Overview <CommandShortcut>G O</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('All founders') && (
              <CommandItem value="go-all" onSelect={run(() => go('founders', 'all'))}>
                <Users /> All founders <CommandShortcut>{counts.all}</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('In ascend confirmed') && (
              <CommandItem value="go-in" onSelect={run(() => go('founders', 'in_ascend'))}>
                <StatusIcon status="CONFIRMED" className="size-3.5" /> In ascend <CommandShortcut>{counts.in_ascend}</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('Needs review') && (
              <CommandItem value="go-review" onSelect={run(() => go('founders', 'review'))}>
                <StatusIcon status="PROBABLE" className="size-3.5" /> Needs review <CommandShortcut>{counts.review}</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('Not in ascend') && (
              <CommandItem value="go-not" onSelect={run(() => go('founders', 'not_found'))}>
                <StatusIcon status="NOT FOUND" className="size-3.5" /> Not in ascend <CommandShortcut>{counts.not_found}</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            {matchQ('Export to Excel') && (
              <CommandItem value="export" onSelect={run(() => setUi({ exportOpen: true }))}>
                <Download /> Export to Excel… <CommandShortcut>E</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('Toggle theme dark light') && (
              <CommandItem value="theme" onSelect={run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
                {resolvedTheme === 'dark' ? <Sun /> : <Moon />} Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} theme
              </CommandItem>
            )}
            {matchQ('Keyboard shortcuts') && (
              <CommandItem value="shortcuts" onSelect={run(() => setUi({ shortcutsOpen: true }))}>
                <Keyboard /> Keyboard shortcuts <CommandShortcut>?</CommandShortcut>
              </CommandItem>
            )}
            {matchQ('Lock workspace sign out') && (
              <CommandItem value="lock" onSelect={run(lock)}>
                <Lock /> Lock workspace
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
