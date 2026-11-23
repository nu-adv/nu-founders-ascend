import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getSavedPassword, savePassword, unlockVault } from '@/lib/vault'
import type { FoundersData } from '@/lib/types'

/** Typographic red "N" monogram (not the official university mark). */
function Monogram({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid size-10 place-items-center rounded-md bg-brand font-heading text-[1.65rem] leading-none font-semibold text-brand-foreground shadow-[0_8px_30px_-8px] shadow-brand/60 ${className}`}
    >
      N
    </span>
  )
}

export function LoginScreen({ onUnlock }: { onUnlock: (data: FoundersData) => void }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(() => !!getSavedPassword())
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }

  return (
    <div className="relative grid min-h-svh bg-background lg:grid-cols-[1.15fr_1fr]">
      {/* Ink panel: always dark, Northeastern red + black */}
      <section className="relative isolate flex min-h-[44svh] flex-col overflow-hidden bg-[oklch(0.12_0.004_30)] px-6 py-7 text-[oklch(0.96_0.004_85)] sm:px-10 sm:py-9 lg:min-h-svh lg:px-14 lg:py-12">
        <div aria-hidden className="nu-hatch absolute inset-0 -z-10 text-white/60" />
        <div aria-hidden className="nu-grain absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay" />
        <div
          aria-hidden
          className="absolute -top-40 -right-32 -z-10 size-[34rem] rounded-full bg-brand/35 blur-[120px] lg:-right-10"
        />
        <div aria-hidden className="absolute inset-y-0 right-0 -z-10 hidden w-px bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block" />

        <header className="flex items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700">
          <Monogram />
          <div className="leading-tight">
            <p className="text-[0.95rem] font-semibold tracking-tight">Northeastern Founders</p>
            <p className="text-xs text-white/55">ascend match ledger</p>
          </div>
        </header>

        <div className="my-auto max-w-xl py-10 lg:py-0">
          <p className="mb-5 text-[0.7rem] font-semibold tracking-[0.22em] text-white/60 uppercase motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
            Advancement Research <span className="text-brand">·</span> Private
          </p>
          <h1 className="font-heading text-[2.6rem] leading-[1.02] font-medium tracking-[-0.02em] text-balance sm:text-6xl lg:text-[4.6rem] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:delay-100 motion-safe:duration-700 motion-safe:fill-mode-both">
            Northeastern founders, <em className="font-normal text-brand italic">matched to ascend</em>.
          </h1>
          <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-white/65 motion-safe:animate-in motion-safe:fade-in motion-safe:delay-200 motion-safe:duration-700 motion-safe:fill-mode-both">
            Founders from PitchBook and the Northeastern Founders directory, checked one by one against
            ascend constituent and household records.
          </p>
        </div>

        <footer className="hidden items-center gap-2 text-xs text-white/45 lg:flex">
          <ShieldCheck className="size-3.5" />
          Data is encrypted and only readable with the team password.
        </footer>
      </section>

      {/* Form side: follows the light / dark theme */}
      <section className="relative flex items-center justify-center px-6 py-10 sm:px-10">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:delay-150 motion-safe:duration-500 motion-safe:fill-mode-both">
          <div className="mb-8 flex size-11 items-center justify-center rounded-full border bg-card shadow-sm">
            <LockKeyhole className="size-5 text-primary" />
          </div>
          <h2 className="font-heading text-3xl font-medium tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Enter the team password to open the ledger.</p>

          {restoring ? (
            <div className="mt-8 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Unlocking your saved session…
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
                    className="h-11 pr-11 pl-9 text-base sm:text-sm"
                    placeholder="••••••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {error && (
                  <p id="password-error" role="alert" className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} disabled={busy} />
                <Label htmlFor="remember" className="font-normal text-muted-foreground">
                  Keep me signed in on this device
                </Label>
              </div>

              <Button type="submit" size="lg" className="h-11 w-full text-[0.95rem]" disabled={busy || !password}>
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

          <p className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
            For Advancement Research use only. Ask the project owner for the password.
          </p>
        </div>
      </section>
    </div>
  )
}
