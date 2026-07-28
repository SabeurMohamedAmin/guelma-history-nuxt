import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

/**
 * Password hashing primitives.
 *
 * Uses Node's built-in scrypt (memory-hard, recommended by OWASP) so there is
 * no external dependency and the same logic works at runtime and in scripts
 * (e.g. seeding). Hashes are stored as `salt:derivedKey` in hex.
 *
 * Single responsibility: turn a plain password into a verifiable hash and back.
 */

const scryptAsync = promisify(scrypt)

const SALT_BYTES = 16
const KEY_LENGTH = 64
const SEPARATOR = ':'

/** Hash a plain-text password into a salted, storable string. */
export async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}${SEPARATOR}${derivedKey.toString('hex')}`
}

/** Verify a plain-text password against a previously stored hash. */
export async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(SEPARATOR)
  if (!salt || !key) return false

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  const storedKey = Buffer.from(key, 'hex')

  // Length guard prevents timingSafeEqual from throwing on mismatched buffers.
  if (storedKey.length !== derivedKey.length) return false

  return timingSafeEqual(storedKey, derivedKey)
}

/**
 * A valid hash of a random password, generated once at module load using the
 * exact same scrypt parameters as real hashes. Used to run a genuine
 * verification even when the account does not exist, so login timing can't
 * reveal whether a username is valid (prevents user enumeration). Because it
 * is a well-formed `salt:64-byte-key` hash, the unknown-user path reaches
 * `timingSafeEqual` just like the known-user path.
 */
export const DUMMY_PASSWORD_HASH: string = (() => {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = scryptSync(randomBytes(32).toString('hex'), salt, KEY_LENGTH)
  return `${salt}${SEPARATOR}${derivedKey.toString('hex')}`
})()
