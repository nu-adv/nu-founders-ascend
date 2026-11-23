import { useCallback, useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { LoginScreen } from '@/components/LoginScreen'
import { Workspace } from '@/components/workspace/Workspace'
import { clearSavedPassword } from '@/lib/vault'
import type { FoundersData } from '@/lib/types'

export default function App() {
  const [data, setData] = useState<FoundersData | null>(null)
  const onUnlock = useCallback((d: FoundersData) => setData(d), [])
  const onLogout = useCallback(() => {
    clearSavedPassword()
    setData(null)
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="nfa.theme">
      <TooltipProvider delayDuration={250}>
        {data ? (
          <Workspace founders={data.founders} generated={data.generated} onLogout={onLogout} />
        ) : (
          <LoginScreen onUnlock={onUnlock} />
        )}
        <Toaster position="bottom-center" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  )
}
