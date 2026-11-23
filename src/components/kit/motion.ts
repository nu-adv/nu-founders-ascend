import type { Transition } from 'motion/react'

/** Shared motion presets so every surface moves the same way. */
export const ease = [0.22, 1, 0.36, 1] as const

export const spring: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }
export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }
export const fade: Transition = { duration: 0.18, ease }

export const panelIn = {
  initial: { opacity: 0, x: 24, scale: 0.985 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 24, scale: 0.985 },
  transition: springSoft,
}

export const riseIn = (i = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease, delay: Math.min(i, 10) * 0.04 },
})
