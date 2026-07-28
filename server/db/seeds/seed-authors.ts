import { randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { argv } from 'node:process'
import { pathToFileURL } from 'node:url'
import { authors, users, db, eq, seedClient } from './_client'

/**
 * Creates or updates two test author accounts (role: 'author').
 *
 * Usage (standalone):
 *   pnpm db:seed:authors
 *
 * Also called from `seed.ts` (via the exported `seedAuthorAccounts`) so a
 * single `pnpm db:seed` run creates the author accounts before inserting
 * articles. Article ownership (articles.createdByUserId) is then assigned
 * across these accounts; it is NOT derived from the byline.
 *
 * Credentials default to the example accounts documented in .env.example and
 * can be overridden via NUXT_AUTHOR1_* / NUXT_AUTHOR2_* env vars.
 *
 * Each author account is also linked to an `authors` byline row (users.authorId)
 * by the byline slug below. This is the DISPLAY byline only (the name on the
 * article), and is independent of ownership. The byline rows are created by
 * `seed.ts`; when run standalone, run the base seed first. If a byline slug is
 * not found yet, the link is left null (re-run after the base seed).
 *
 * Idempotent: existing accounts (matched by email) are updated in place, so
 * re-running refreshes credentials without creating duplicates. Usernames and
 * emails are stored lowercased to match the auth normalization.
 */

const scryptAsync = promisify(scrypt)

async function createPasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

interface AuthorSeed {
  username: string
  email: string
  password: string
  displayName: string
  firstName: string
  lastName: string
  dateOfBirth: string
  // Slug of the `authors` byline row this account writes under (created by
  // seed.ts). Used to populate users.authorId.
  bylineSlug: string
}

function readAuthorSeeds(): AuthorSeed[] {
  return [
    {
      username: (process.env.NUXT_AUTHOR1_USERNAME?.trim() || 'author-1').toLowerCase(),
      email: (process.env.NUXT_AUTHOR1_EMAIL?.trim() || 'author-1@outlook.fr').toLowerCase(),
      password: process.env.NUXT_AUTHOR1_PASSWORD || '12345678',
      displayName: process.env.NUXT_AUTHOR1_DISPLAY_NAME?.trim() || 'Amina Belkacem',
      firstName: 'Amina',
      lastName: 'Belkacem',
      dateOfBirth: '1990-04-12',
      bylineSlug: 'ahmed-ben-mohamed',
    },
    {
      username: (process.env.NUXT_AUTHOR2_USERNAME?.trim() || 'author-2').toLowerCase(),
      email: (process.env.NUXT_AUTHOR2_EMAIL?.trim() || 'author-2@outlook.fr').toLowerCase(),
      password: process.env.NUXT_AUTHOR2_PASSWORD || '12345678',
      displayName: process.env.NUXT_AUTHOR2_DISPLAY_NAME?.trim() || 'Yacine Haddad',
      firstName: 'Yacine',
      lastName: 'Haddad',
      dateOfBirth: '1985-11-03',
      bylineSlug: 'fatima-zohra-boualam',
    },
  ]
}

/** Resolve the byline `authors` row id for a slug, or null if not seeded yet. */
async function resolveBylineId(slug: string): Promise<number | null> {
  const [byline] = await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, slug))
  if (!byline) {
    console.warn(`\u26A0\uFE0F  Byline "${slug}" not found \u2014 run \`pnpm db:seed\` first; leaving authorId null.`)
    return null
  }
  return byline.id
}

async function seedAuthor(seed: AuthorSeed): Promise<void> {
  const passwordHash = await createPasswordHash(seed.password)
  const authorId = await resolveBylineId(seed.bylineSlug)
  const [existing] = await db.select().from(users).where(eq(users.email, seed.email))

  if (existing) {
    await db
      .update(users)
      .set({
        username: seed.username,
        passwordHash,
        role: 'author',
        authorId,
        profileCompleted: true,
        emailVerifiedAt: new Date(),
        displayName: seed.displayName,
        firstName: seed.firstName,
        lastName: seed.lastName,
        dateOfBirth: seed.dateOfBirth,
      })
      .where(eq(users.email, seed.email))

    console.log(`\u{1F501} Author "${seed.email}" already existed \u2014 credentials updated.`)
    return
  }

  await db.insert(users).values({
    username: seed.username,
    email: seed.email,
    passwordHash,
    role: 'author',
    authorId,
    profileCompleted: true,
    emailVerifiedAt: new Date(),
    displayName: seed.displayName,
    firstName: seed.firstName,
    lastName: seed.lastName,
    dateOfBirth: seed.dateOfBirth,
  })

  console.log(`\u2705 Author "${seed.email}" created.`)
}

/**
 * Seed the author accounts and their byline links. Does NOT close the shared
 * seed client, so it can be composed by other seeders (e.g. seed.ts). Standalone
 * runs go through the wrapper below, which owns closing the connection.
 */
export async function seedAuthorAccounts(): Promise<void> {
  for (const seed of readAuthorSeeds()) {
    await seedAuthor(seed)
  }

  console.warn('\u26A0\uFE0F  Using the default author password. Override NUXT_AUTHOR*_PASSWORD for production.')
}

// Standalone entry point: `tsx server/db/seeds/seed-authors.ts`. Detect direct
// execution by comparing the resolved URL of the executed file (argv[1]) with
// this module's URL, so importing it from seed.ts does not also run + close it.
// Robust to invocation path, symlinks and working directory, unlike a filename
// string match.
const entryUrl = argv[1] ? pathToFileURL(argv[1]).href : undefined
const isDirectRun = entryUrl === import.meta.url

if (isDirectRun) {
  seedAuthorAccounts()
    .then(() => seedClient.end())
    .catch(async (error) => {
      console.error('\u274C Failed to seed authors:', error)
      await seedClient.end({ timeout: 1 }).catch(() => {})
      process.exit(1)
    })
}
