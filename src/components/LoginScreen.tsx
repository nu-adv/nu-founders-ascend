import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BrandMark } from '@/components/kit/primitives'
import { ease } from '@/components/kit/motion'
import { getSavedPassword, savePassword, unlockVault } from '@/lib/vault'
import type { FoundersData } from '@/lib/types'

export function LoginScreen({ onUnlock }: { onUnlock: (data: FoundersData) => void }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(() => !!getSavedPassword())
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shake = useAnimationControls()

  // Silent sign-in when this tab (or a remembered device) already has the password.
  useEffect(() => {
    const saved = getSavedPassword()
    if (!saved) return
    let cancelled = false
    unlockVault(saved)
      .then((data) => {
        if (!cancelled) onUnlock(data)
      })
      .catch(() => {
        if (!cancelled) setRestoring(false)
      })
    return () => {
      cancelled = true
    }
  }, [onUnlock])

  useEffect(() => {
    if (!restoring) inputRef.current?.focus()
  }, [restoring])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      const data = await unlockVault(password)
      savePassword(password, remember)
      onUnlock(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg === 'WRONG_PASSWORD' ? "That password didn't work." : msg)
      setBusy(false)
      void shake.start({ x: [0, -8, 7, -5, 3, 0], transition: { duration: 0.42, ease: 'easeOut' } })
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }

  return (
    <div className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-canvas px-4 py-10">
      {/* very quiet backdrop: diagonal hatch fading out + soft brand glow */}
      <div
        aria-hidden
        className="nu-hatch absolute inset-0 -z-10 text-foreground/40 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]"
      />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -z-10 size-[36rem] -translate-x-1/2 -translate-y-[58%] rounded-full bg-brand/[0.07] blur-[110px] dark:bg-brand/[0.12]"
      />
      <ThemeToggle className="absolute top-4 right-4" />

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-sm"
      >
        <motion.div
          animate={shake}
          className="rounded-2xl border bg-surface p-7 shadow-[var(--shadow-float)]"
        >
          <div className="flex items-center gap-3">
            <BrandMark className="size-9 rounded-[0.65rem] text-lg" />
            <div className="min-w-0 leading-tight">
              <h1 className="text-xl font-semibold tracking-tight">Founders × ascend</h1>
              <p className="text-[0.8125rem] text-muted-foreground">Advancement Research · private workspace</p>
            </div>
          </div>

          {restoring ? (
            <div className="mt-7 flex items-center gap-3 rounded-lg border bg-muted/50 px-3.5 py-3 text-[0.8125rem] text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-foreground/70" />
              Unlocking your saved session…
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Team password
                </Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError(null)
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'password-error' : undefined}
                    disabled={busy}
                    className="h-10 rounded-lg pr-10 text-base sm:text-sm"
                    placeholder="Enter password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {error && (
                  <motion.p
                    id="password-error"
                    role="alert"
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium text-destructive"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} disabled={busy} />
                <Label htmlFor="remember" className="text-[0.8125rem] font-normal text-muted-foreground">
                  Keep me signed in on this device
                </Label>
              </div>

              <Button type="submit" className="h-10 w-full rounded-lg text-sm" disabled={busy || !password}>
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" /> Unlocking…
                  </>
                ) : (
                  <>
                    Unlock <ArrowRight />
                  </>
                )}
              </Button>
            </form>
          )}
        </motion.div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" />
          Encrypted. Only readable with the team password.
        </p>
      </motion.div>
    </div>
  )
}
