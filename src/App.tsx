import { useCallback, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { MotionConfig } from 'motion/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { LoginScreen } from '@/components/LoginScreen'
import { AppShell } from '@/components/app/AppShell'
import { StoreProvider } from '@/lib/store'
import { clearSavedPassword } from '@/lib/vault'
import type { FoundersData } from '@/lib/types'

export default function App() {
  const [data, setData] = useState<FoundersData | null>(null)
  const onUnlock = useCallback((d: FoundersData) => setData(d), [])
  const onLock = useCallback(() => {
    clearSavedPassword()
    setData(null)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="nfa.theme">
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          {data ? (
            <StoreProvider data={data} onLock={onLock}>
              <AppShell />
            </StoreProvider>
          ) : (
            <LoginScreen onUnlock={onUnlock} />
          )}
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  )
}
