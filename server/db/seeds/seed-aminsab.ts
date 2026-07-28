import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { users, db, eq, seedClient } from './_client'

/**
 * Seeds a specific admin account: "aminsab".
 *
 * Usage:
 *   pnpm db:seed:aminsab
 *
 * The hashing mirrors `server/utils/password.ts` (salt:scrypt hex) so the
 * seeded account is verifiable by the running app. Standalone scrypt keeps the
 * script runnable via tsx without Nuxt's auto-imports.
 */

const ADMIN = {
  username: 'aminsab',
  email: 'aminsab@outloo.fr',
  password: '123456',
}

const scryptAsync = promisify(scrypt)

async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

async function seedAminsab() {
  const passwordHash = await createPasswordHash(ADMIN.password)
  const email = ADMIN.email.toLowerCase()
  const [existing] = await db.select().from(users).where(eq(users.username, ADMIN.username))

  if (existing) {
    // Always reassert role 'admin': the column defaults to 'user', so an
    // existing row left untouched here could otherwise lose admin access.
    await db.update(users).set({ email, passwordHash, role: 'admin', profileCompleted: true, emailVerifiedAt: new Date() }).where(eq(users.username, ADMIN.username))
    console.log(`🔑 Admin "${ADMIN.username}" already existed — email + password updated.`)
  }
  else {
    await db.insert(users).values({ username: ADMIN.username, email, passwordHash, role: 'admin', profileCompleted: true, emailVerifiedAt: new Date() })
    console.log(`✅ Admin "${ADMIN.username}" created (${email}).`)
  }

  await seedClient.end()
}

seedAminsab().catch((error) => {
  console.error('❌ Failed to seed admin:', error)
  process.exit(1)
})
