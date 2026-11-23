import type { FoundersData } from '@/lib/types'

/**
 * Data ships only as encrypted files in public/data/: gzip -> AES-256-GCM, key from PBKDF2-SHA256.
 *   vault.json  founders (needed to unlock)
 *   logos.json  company logos, loaded in the background after unlock
 * The password is never stored in the code; a wrong password simply fails AES-GCM authentication.
 */
interface VaultFile {
  v: number
  kdf: string
  iter: number
  salt: string
  iv: string
  data: string
}

const SESSION_KEY = 'nfa.session'
const REMEMBER_KEY = 'nfa.remember'

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function gunzip(bytes: ArrayBuffer): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

const fileCache = new Map<string, Promise<VaultFile | null>>()

function loadFile(name: string, optional = false): Promise<VaultFile | null> {
  let p = fileCache.get(name)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${name}`, { cache: 'no-store' })
      .then(async (res) => {
        if (optional && res.status === 404) return null
        if (!res.ok) throw new Error(`Could not load the data file (HTTP ${res.status}).`)
        return (await res.json()) as VaultFile
      })
      .catch((err: unknown) => {
        fileCache.delete(name)
        throw err instanceof Error ? err : new Error('Could not load the data file.')
      })
    fileCache.set(name, p)
  }
  return p
}

async function decrypt(file: VaultFile, password: string): Promise<string> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(file.salt), iterations: file.iter, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, key, fromBase64(file.data))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'OperationError') throw new Error('WRONG_PASSWORD')
    throw new Error('The data could not be decrypted.')
  }
  return gunzip(plain)
}

let unlockedWith: string | null = null

export async function unlockVault(password: string): Promise<FoundersData> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot decrypt the data (Web Crypto is unavailable). Open the site over https.')
  }
  const vault = (await loadFile('vault.json'))!
  const text = await decrypt(vault, password)
  try {
    const data = JSON.parse(text) as FoundersData
    unlockedWith = password
    return data
  } catch {
    throw new Error('The data file is damaged or in an unexpected format.')
  }
}

/** Company logos (key -> data URI). Resolves to {} if the file is missing or anything fails. */
export async function loadLogos(): Promise<Record<string, string>> {
  if (!unlockedWith) return {}
  try {
    const file = await loadFile('logos.json', true)
    if (!file) return {}
    return JSON.parse(await decrypt(file, unlockedWith)) as Record<string, string>
  } catch {
    return {}
  }
}

export function savePassword(pw: string, remember: boolean): void {
  try {
    sessionStorage.setItem(SESSION_KEY, pw)
  } catch {
    /* storage unavailable: user will just sign in again next time */
  }
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, pw)
    else localStorage.removeItem(REMEMBER_KEY)
  } catch {
    /* ignore */
  }
}

export function getSavedPassword(): string | null {
  try {
    const s = sessionStorage.getItem(SESSION_KEY)
    if (s) return s
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(REMEMBER_KEY)
  } catch {
    return null
  }
}

export function clearSavedPassword(): void {
  unlockedWith = null
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(REMEMBER_KEY)
  } catch {
    /* ignore */
  }
}
