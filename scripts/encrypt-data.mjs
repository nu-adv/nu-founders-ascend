// Encrypts private/founders.json into public/data/vault.json.
//
//   gzip -> AES-256-GCM with a key from PBKDF2-SHA256 (600,000 iterations, random salt + IV)
//
// The password comes from the VAULT_PASSWORD environment variable, or private/PASSWORD.txt.
// Only the encrypted vault.json is published; the readable data and the password never leave private/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webcrypto as crypto } from 'node:crypto'
import { gzipSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'private', 'founders.json')
const out = join(root, 'public', 'data', 'vault.json')
const pwFile = join(root, 'private', 'PASSWORD.txt')
const ITERATIONS = 600_000

const password = (process.env.VAULT_PASSWORD ?? (existsSync(pwFile) ? readFileSync(pwFile, 'utf8') : '')).trim()
if (!password) {
  console.error('No password: set VAULT_PASSWORD or create private/PASSWORD.txt')
  process.exit(1)
}
if (!existsSync(src)) {
  console.error(`Missing ${src}. Run: python3 scripts/prepare_data.py <lookup-data-dir>`)
  process.exit(1)
}

const b64 = (bytes) => Buffer.from(bytes).toString('base64')

async function encryptFile(srcPath, outPath) {
  const plain = gzipSync(readFileSync(srcPath), { level: 9 })
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain))
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(cipher) }))
  console.log(`Encrypted ${(readFileSync(srcPath).length / 1e6).toFixed(1)} MB -> ${outPath.slice(root.length + 1)} (${(readFileSync(outPath).length / 1e3).toFixed(0)} KB)`)
}

await encryptFile(src, out)
// Optional second file: company logos (loaded by the site in the background after unlock)
const logosSrc = join(root, 'private', 'logos.json')
if (existsSync(logosSrc)) await encryptFile(logosSrc, join(root, 'public', 'data', 'logos.json'))
