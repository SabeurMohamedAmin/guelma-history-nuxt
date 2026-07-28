import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { users, db, eq, seedClient } from './_client'

/**
 * Creates or updates the initial admin account.
 *
 * Usage:
 *   pnpm db:seed:admin
 *   NUXT_ADMIN_USERNAME=guelma NUXT_ADMIN_PASSWORD=secret pnpm db:seed:admin
 *
 * Avatar images are intentionally not seeded. Profile avatars are uploaded from
 * the admin profile page and stored in the users table as bytea blobs.
 *
 * The seeded account is always given role 'admin' explicitly: the role column
 * defaults to 'user', so omitting it here would lock the administrator out of
 * admin-gated routes.
 */

const DEFAULT_USERNAME = 'admin'
const DEFAULT_EMAIL = 'admin@guelma-history.dz'
const DEFAULT_PASSWORD = '12345678'

const scryptAsync = promisify(scrypt)

async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

function readAdminSeed() {
  return {
    username: (process.env.NUXT_ADMIN_USERNAME?.trim() || DEFAULT_USERNAME).toLowerCase(),
    email: (process.env.NUXT_ADMIN_EMAIL?.trim() || DEFAULT_EMAIL).toLowerCase(),
    password: process.env.NUXT_ADMIN_PASSWORD || DEFAULT_PASSWORD,
    displayName: process.env.NUXT_ADMIN_DISPLAY_NAME?.trim() || null,
  }
}

async function seedAdmin() {
  const seed = readAdminSeed()
  const passwordHash = await createPasswordHash(seed.password)
  const [existing] = await db.select().from(users).where(eq(users.username, seed.username))

  if (existing) {
    await db
      .update(users)
      .set({
        email: seed.email,
        passwordHash,
        role: 'admin',
        profileCompleted: true,
        emailVerifiedAt: new Date(),
        displayName: seed.displayName ?? existing.displayName,
      })
      .where(eq(users.username, seed.username))

    console.log(`🔑 Admin "${seed.username}" already existed — credentials updated.`)
  }
  else {
    await db.insert(users).values({
      username: seed.username,
      email: seed.email,
      passwordHash,
      role: 'admin',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      displayName: seed.displayName,
      avatar: null,
      avatarData: null,
      avatarMimeType: null,
      avatarUpdatedAt: null,
      passwordChangedAt: null,
    })

    console.log(`✅ Admin "${seed.username}" created (${seed.email}).`)
  }

  if (seed.password === DEFAULT_PASSWORD) {
    console.warn('⚠️  Using the default password. Set NUXT_ADMIN_PASSWORD and re-run for production.')
  }

  await seedClient.end()
}

seedAdmin().catch(async (error) => {
  console.error('❌ Failed to seed admin:', error)
  await seedClient.end({ timeout: 1 }).catch(() => {})
  process.exit(1)
})
