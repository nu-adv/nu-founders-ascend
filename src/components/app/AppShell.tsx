import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Keyboard, LayoutGrid, Lock, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { useStore, type CategoryRoute } from '@/lib/store'
import { usePersistentState } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ExportDialog } from '@/components/ExportDialog'
import { ShortcutsDialog } from '@/components/ShortcutsDialog'
import { Overview } from '@/components/views/Overview'
import { BrandMark, IconButton, Kbd, Panel, PanelHeader } from '@/components/kit/primitives'
import { ease, springSoft } from '@/components/kit/motion'
import { Sidebar } from './Sidebar'
import { FoundersView } from './FoundersView'
import { CommandMenu } from './CommandMenu'

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

const CATS: CategoryRoute[] = ['all', 'in_ascend', 'review', 'not_found']
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function AppShell() {
  const isDesktop = useMedia('(min-width: 1024px)')
  const compact = !useMedia('(min-width: 768px)')
  const s = useStore()
  const { route, ui, setUi, go, founders, rows, decisions, generated, lock } = s
  const [sidebarOpen, setSidebarOpen] = usePersistentState<boolean>('sidebar.v2', true)
  const showSidebar = isDesktop && sidebarOpen
  const gPressed = useRef(0)

  // global shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setUi({ commandOpen: !ui.commandOpen })
        return
      }
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey || ui.exportOpen || ui.commandOpen || ui.shortcutsOpen) return
      if (Date.now() - gPressed.current < 900) {
        gPressed.current = 0
        if (e.key === 'o') return go('overview')
        if (e.key === 'f') return go('founders', 'all')
        if (e.key === 'r') return go('founders', 'review')
      }
      if (e.key === '[') setSidebarOpen((v) => !v)
      else if (e.key === 'g') gPressed.current = Date.now()
      else if (e.key === '?') setUi({ shortcutsOpen: true })
      else if (e.key === 'e') setUi({ exportOpen: true })
      else if (['1', '2', '3', '4'].includes(e.key)) go('founders', CATS[Number(e.key) - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ui, setUi, go, setSidebarOpen])


  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-foreground">
      {isDesktop && (
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }}
          transition={springSoft}
          className="shrink-0 overflow-hidden"
          aria-label="Navigation"
          aria-hidden={!sidebarOpen}
        >
          <div className="h-full w-60">
            <Sidebar />
          </div>
        </motion.aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className={cn('flex h-12 shrink-0 items-center gap-2 px-2', showSidebar && 'lg:pl-0')}>
          {isDesktop && (
            <div className="flex items-center gap-1.5">
              <IconButton label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} shortcut="[" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </IconButton>
              {!sidebarOpen && <BrandMark className="size-6" />}
            </div>
          )}
          {!isDesktop && (
            <>
              <IconButton label="Menu" onClick={() => setUi({ navOpen: true })}>
                <Menu />
              </IconButton>
              <BrandMark className="size-6 text-xs" />
            </>
          )}
          <div className="flex min-w-0 flex-1 justify-center">
            <button
              onClick={() => setUi({ commandOpen: true })}
              className="flex h-[34px] w-full max-w-[420px] items-center gap-2 rounded-[0.65rem] border bg-surface px-3 text-[0.8125rem] text-muted-foreground shadow-[var(--shadow-hairline)] transition-colors outline-none hover:border-input hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-4" />
              <span className="flex-1 truncate text-left"><span className="sm:hidden">Search…</span><span className="max-sm:hidden">Search founders, companies, ascend IDs…</span></span>
              <Kbd className="max-sm:hidden">{isMac ? '⌘K' : 'Ctrl K'}</Kbd>
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle className="size-[34px] rounded-[0.6rem] text-muted-foreground hover:text-foreground" />
            <IconButton label="Shortcuts" shortcut="?" onClick={() => setUi({ shortcutsOpen: true })} className="max-md:hidden">
              <Keyboard />
            </IconButton>
            <IconButton label="Lock" onClick={lock} className="max-sm:hidden">
              <Lock />
            </IconButton>
          </div>
        </header>

        <main className={cn('flex min-h-0 flex-1 px-2 pb-2', showSidebar && 'lg:pl-0')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={route.view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease }}
              className="flex min-h-0 min-w-0 flex-1"
            >
              <Panel>
                {route.view === 'overview' ? (
                  <>
                    <PanelHeader>
                      <LayoutGrid className="size-4 text-muted-foreground" />
                      <h1 className="text-sm font-medium">Overview</h1>
                      <span className="text-[0.8125rem] text-muted-foreground max-sm:hidden">PitchBook + Northeastern Founders, matched to ascend · {generated}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 rounded-[0.6rem] text-xs max-sm:hidden" onClick={() => go('founders', 'review')}>
                          Open review queue
                        </Button>
                        <Button size="sm" className="h-8 gap-1.5 rounded-[0.6rem] px-3 text-xs" onClick={() => setUi({ exportOpen: true })}>
                          <Download className="size-3.5" /> Export
                        </Button>
                      </div>
                    </PanelHeader>
                    <Overview />
                  </>
                ) : (
                  <FoundersView isDesktop={isDesktop} compact={compact} />
                )}
              </Panel>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!isDesktop && (
        <Sheet open={ui.navOpen} onOpenChange={(o) => setUi({ navOpen: o })}>
          <SheetContent side="left" className="w-[84vw] gap-0 bg-canvas p-0 data-[side=left]:w-[84vw] data-[side=left]:sm:max-w-xs">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Views and saved filters</SheetDescription>
            <Sidebar onNavigate={() => setUi({ navOpen: false })} />
          </SheetContent>
        </Sheet>
      )}

      <CommandMenu />
      <ExportDialog
        open={ui.exportOpen}
        onOpenChange={(o) => setUi({ exportOpen: o })}
        filteredRows={rows}
        selectedRows={[]}
        allRows={founders}
        decisions={decisions}
      />
      <ShortcutsDialog open={ui.shortcutsOpen} onOpenChange={(o) => setUi({ shortcutsOpen: o })} />
    </div>
  )
}
