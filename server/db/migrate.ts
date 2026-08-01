/**
 * Applies pending SQL migrations to CockroachDB. Run with `pnpm db:migrate`.
 *
 * Why this exists instead of `drizzle-kit migrate`:
 * drizzle-kit talks to the database through PostgreSQL-only code paths that
 * CockroachDB rejects (`drizzle-kit push` fails while merely reading the
 * schema), and it hides the cause behind its spinner — you get exit code 1 and
 * no message. This script does the same job in plain SQL and prints exactly
 * which migration and which statement failed.
 *
 * It reads the SAME `migrations/meta/_journal.json` and keeps Drizzle's own
 * ledger table (`drizzle.__drizzle_migrations`: one row per applied migration,
 * holding the folder timestamp), so `pnpm db:generate` and drizzle-kit stay in
 * sync with whatever this applies.
 *
 * Statements run one at a time, outside a transaction, because CockroachDB
 * auto-commits before every DDL anyway — wrapping them would only mask errors.
 *
 * Baselining an existing database:
 *   pnpm db:migrate --baseline 0004_redundant_longshot
 * `drizzle-kit push` creates tables without writing the ledger, so a database
 * built that way looks brand new to any migration tool and the first migration
 * fails with "relation already exists". Baselining records every migration up
 * to and including <tag> as applied WITHOUT running it, then applies the rest.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

// Migrations run outside Nuxt, so load .env ourselves (like the seed scripts).
try {
  process.loadEnvFile?.()
}
catch {
  // .env is optional — the URL may come from the shell instead.
}

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
  console.error('NUXT_DATABASE_URL is not set. Add your CockroachDB connection string to .env.')
  process.exit(1)
}

const migrationsDir = fileURLToPath(new URL('./migrations/', import.meta.url))

interface JournalEntry {
  idx: number
  when: number
  tag: string
}

const journal = JSON.parse(
  readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8'),
) as { entries: JournalEntry[] }

/** Read `--baseline <tag>` (or `--baseline=<tag>`) from the command line. */
function readBaselineFlag(args: string[]): string | undefined {
  const index = args.findIndex(arg => arg === '--baseline' || arg.startsWith('--baseline='))
  if (index === -1) return undefined

  const arg = args[index]!
  const value = arg.includes('=') ? arg.split('=')[1] : args[index + 1]

  if (!value) throw new Error('--baseline needs a migration tag, e.g. --baseline 0004_redundant_longshot')
  return value
}

/** Split generated migrations and hand-written one-command-per-line migrations. */
function readMigration(tag: string): { statements: string[], hash: string } {
  const file = readFileSync(join(migrationsDir, `${tag}.sql`), 'utf8')
  const separator = file.includes('--> statement-breakpoint')
    ? '--> statement-breakpoint'
    : /;\s*(?=(?:--[^\n]*\n|\s)*[A-Z])/g

  return {
    statements: file
      .split(separator)
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0)
      .map(statement => statement.endsWith(';') ? statement : `${statement};`),
    // Same hash Drizzle stores, so its own tooling recognises our rows.
    hash: createHash('sha256').update(file).digest('hex'),
  }
}

// `prepare: false` and a single connection are what CockroachDB is happiest
// with for DDL (the seed scripts use the same options).
const sql = postgres(connectionString, { prepare: false, max: 1 })

/** Write one ledger row so the migration is never applied twice. */
async function recordApplied(entry: JournalEntry, hash: string): Promise<void> {
  await sql.unsafe(
    'INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)',
    [hash, entry.when],
  )
}

/**
 * The UUID conversion maps integer text deterministically. Running it against a
 * partially converted database would hash UUID text and break relationships, so
 * refuse to start unless every converted primary key still has an integer type.
 */
const CONVERTED_UUID_PRIMARY_KEY_TABLES = [
  'authors',
  'categories',
  'users',
  'articles',
  'tags',
  'article_comments',
  'article_correction_requests',
  'article_media',
  'bookmarks',
  'comment_votes',
  'comment_flags',
  'notification_mutes',
  'subscribers',
  'newsletter_article_emails',
  'contact_messages',
  'user_oauth_accounts',
  'password_reset_tokens',
] as const

/** Every table whose single-column primary key is an application UUID. */
const UUID_PRIMARY_KEY_TABLES = [
  ...CONVERTED_UUID_PRIMARY_KEY_TABLES,
  'comments',
  'notifications',
] as const

/** Foreign keys that migration 0011 converts from integer to UUID. */
const CONVERTED_UUID_RELATION_COLUMNS = [
  ['categories', 'parent_id'],
  ['users', 'author_id'],
  ['articles', 'category_id'],
  ['articles', 'author_id'],
  ['articles', 'created_by_user_id'],
  ['article_comments', 'article_id'],
  ['article_correction_requests', 'article_id'],
  ['article_media', 'article_id'],
  ['article_tags', 'article_id'],
  ['article_tags', 'tag_id'],
  ['password_reset_tokens', 'user_id'],
  ['user_oauth_accounts', 'user_id'],
  ['comments', 'article_id'],
  ['comments', 'author_id'],
  ['comment_votes', 'user_id'],
  ['comment_flags', 'reporter_id'],
  ['notification_mutes', 'user_id'],
  ['notification_mutes', 'article_id'],
  ['notifications', 'recipient_id'],
  ['notifications', 'actor_id'],
  ['notifications', 'article_id'],
  ['bookmarks', 'user_id'],
  ['bookmarks', 'article_id'],
  ['newsletter_article_emails', 'article_id'],
  ['newsletter_article_emails', 'subscriber_id'],
] as const

/** Relations that were UUIDs before migration 0011. */
const EXISTING_UUID_RELATION_COLUMNS = [
  ['comments', 'parent_id'],
  ['comment_votes', 'comment_id'],
  ['comment_flags', 'comment_id'],
  ['notification_mutes', 'comment_id'],
  ['notifications', 'comment_id'],
] as const

/** Every application foreign-key column that references a UUID primary key. */
const UUID_RELATION_COLUMNS = [
  ...CONVERTED_UUID_RELATION_COLUMNS,
  ...EXISTING_UUID_RELATION_COLUMNS,
] as const

async function assertUuidMigrationSourceSchema(): Promise<void> {
  const rows = await sql.unsafe<{
    table_name: string
    column_name: string
    data_type: string
  }[]>(
    `SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'`,
  )

  const columns = new Map(
    rows.map(row => [`${row.table_name}.${row.column_name}`, row.data_type]),
  )
  const integerTypes = new Set(['smallint', 'integer', 'bigint'])
  const expectedIntegerColumns = [
    ...CONVERTED_UUID_PRIMARY_KEY_TABLES.map(table => [table, 'id'] as const),
    ...CONVERTED_UUID_RELATION_COLUMNS,
  ]
  const expectedUuidColumns = [
    ['comments', 'id'],
    ['notifications', 'id'],
    ...EXISTING_UUID_RELATION_COLUMNS,
  ] as const

  const invalidIntegers = expectedIntegerColumns.flatMap(([table, column]) => {
    const key = `${table}.${column}`
    const type = columns.get(key)
    return integerTypes.has(type ?? '') ? [] : [`${key}=${type ?? 'missing'}`]
  })
  const invalidUuids = expectedUuidColumns.flatMap(([table, column]) => {
    const key = `${table}.${column}`
    const type = columns.get(key)
    return type === 'uuid' ? [] : [`${key}=${type ?? 'missing'}`]
  })

  if (invalidIntegers.length > 0 || invalidUuids.length > 0) {
    throw new Error(
      'UUID migration preflight failed ('
      + [...invalidIntegers, ...invalidUuids].join(', ')
      + '). Restore an integer-schema backup or baseline 0011 if the database is already fully converted.',
    )
  }
}

/**
 * Verify the live schema before recording migration 0011 in Drizzle's ledger.
 * A failed DDL statement can leave CockroachDB partially converted because DDL
 * auto-commits, so checking only that the SQL finished is not enough.
 */
async function assertUuidMigrationResult(): Promise<void> {
  const expected = [
    ...UUID_PRIMARY_KEY_TABLES.map(table => [table, 'id'] as const),
    ...UUID_RELATION_COLUMNS,
  ]

  const rows = await sql.unsafe<{
    table_name: string
    column_name: string
    data_type: string
    column_default: string | null
  }[]>(
    `SELECT table_name, column_name, data_type, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'`,
  )

  const columns = new Map(
    rows.map(row => [`${row.table_name}.${row.column_name}`, row]),
  )
  const invalidTypes: string[] = []

  for (const [table, column] of expected) {
    const key = `${table}.${column}`
    const row = columns.get(key)
    if (row?.data_type !== 'uuid') {
      invalidTypes.push(`${key}=${row?.data_type ?? 'missing'}`)
    }
  }

  const invalidDefaults = UUID_PRIMARY_KEY_TABLES.flatMap((table) => {
    const row = columns.get(`${table}.id`)
    return row?.column_default?.toLowerCase().includes('gen_random_uuid')
      ? []
      : [`${table}.id=${row?.column_default ?? 'missing default'}`]
  })

  const constraintRows = await sql.unsafe<{
    table_name: string
    column_name: string
    constraint_type: string
  }[]>(
    `SELECT tc.table_name, kcu.column_name, tc.constraint_type
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_catalog = kcu.constraint_catalog
      AND tc.constraint_schema = kcu.constraint_schema
      AND tc.constraint_name = kcu.constraint_name
      AND tc.table_name = kcu.table_name
     WHERE tc.table_schema = 'public'
       AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')`,
  )
  const constraintTypes = new Map<string, Set<string>>()

  for (const row of constraintRows) {
    const key = `${row.table_name}.${row.column_name}`
    const types = constraintTypes.get(key) ?? new Set<string>()
    types.add(row.constraint_type)
    constraintTypes.set(key, types)
  }

  const missingPrimaryKeys = UUID_PRIMARY_KEY_TABLES.flatMap((table) => {
    const key = `${table}.id`
    return constraintTypes.get(key)?.has('PRIMARY KEY') ? [] : [key]
  })
  const missingForeignKeys = UUID_RELATION_COLUMNS.flatMap(([table, column]) => {
    const key = `${table}.${column}`
    return constraintTypes.get(key)?.has('FOREIGN KEY') ? [] : [key]
  })
  const articleTagPrimaryKeyColumns = ['article_id', 'tag_id']
  const missingArticleTagPrimaryKey = articleTagPrimaryKeyColumns.flatMap((column) => {
    const key = `article_tags.${column}`
    return constraintTypes.get(key)?.has('PRIMARY KEY') ? [] : [key]
  })
  const invalidConstraints = [
    ...missingPrimaryKeys.map(key => `${key}=missing primary key`),
    ...missingForeignKeys.map(key => `${key}=missing foreign key`),
    ...missingArticleTagPrimaryKey.map(key => `${key}=missing composite primary key`),
  ]

  if (invalidTypes.length > 0 || invalidDefaults.length > 0 || invalidConstraints.length > 0) {
    throw new Error(
      'UUID migration verification failed. Invalid schema: '
      + [...invalidTypes, ...invalidDefaults, ...invalidConstraints].join(', '),
    )
  }
}

try {
  const baselineTag = readBaselineFlag(process.argv.slice(2))

  await sql.unsafe('CREATE SCHEMA IF NOT EXISTS "drizzle"')
  await sql.unsafe(`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" SERIAL PRIMARY KEY,
    "hash" text NOT NULL,
    "created_at" bigint
  )`)

  const ledger = await sql.unsafe<{ created_at: string | null }[]>(
    'SELECT created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1',
  )
  let lastApplied = Number(ledger[0]?.created_at ?? 0)

  if (baselineTag) {
    const baseline = journal.entries.find(entry => entry.tag === baselineTag)

    if (!baseline) {
      throw new Error(
        `Unknown baseline "${baselineTag}". Known tags:\n  `
        + journal.entries.map(entry => entry.tag).join('\n  '),
      )
    }

    const uuidMigration = journal.entries.find(
      entry => entry.tag === '0011_preserve_data_uuid_keys',
    )

    // Baselining says the migration already exists in the live database. Never
    // trust that claim for 0011 without checking the actual UUID columns,
    // defaults and constraints first; otherwise a partial conversion becomes
    // permanently hidden behind a successful ledger row.
    if (uuidMigration && baseline.when >= uuidMigration.when && lastApplied < uuidMigration.when) {
      await assertUuidMigrationResult()
    }

    const alreadyInDatabase = journal.entries.filter(
      entry => entry.when <= baseline.when && entry.when > lastApplied,
    )

    for (const entry of alreadyInDatabase) {
      await recordApplied(entry, readMigration(entry.tag).hash)
      console.log(`Baselined ${entry.tag} (recorded, not executed)`)
    }

    lastApplied = Math.max(lastApplied, baseline.when)
  }
  else if (lastApplied === 0) {
    // An empty ledger on a database that already has application tables means
    // the schema came from `drizzle-kit push`, which never records anything.
    // Replaying 0000 would fail with "relation already exists", so stop and
    // explain the one-time fix instead.
    const existing = await sql.unsafe<{ count: string }[]>(
      `SELECT count(*)::text AS count FROM information_schema.tables WHERE table_name = 'articles'`,
    )

    if (Number(existing[0]?.count ?? 0) > 0) {
      throw new Error(
        'This database already has tables, but drizzle.__drizzle_migrations is empty, '
        + 'so every migration looks pending. Record the ones already in the database '
        + 'and apply only the rest with:\n\n'
        + '  pnpm db:migrate --baseline 0004_redundant_longshot\n',
      )
    }
  }

  const pending = journal.entries.filter(entry => entry.when > lastApplied)
  const uuidMigration = journal.entries.find(
    entry => entry.tag === '0011_preserve_data_uuid_keys',
  )

  if (pending.length === 0) {
    // An existing ledger row proves only that someone recorded the migration;
    // audit the live schema on every no-op run so drift or an old partial DDL
    // application is surfaced immediately.
    if (uuidMigration && lastApplied >= uuidMigration.when) {
      await assertUuidMigrationResult()
      console.log('Verified live UUID schema.')
    }

    console.log('Database is up to date, nothing to apply.')
  }

  for (const entry of pending) {
    if (entry.tag === '0011_preserve_data_uuid_keys') {
      await assertUuidMigrationSourceSchema()
    }

    const { statements, hash } = readMigration(entry.tag)
    console.log(`Applying ${entry.tag} (${statements.length} statement(s))...`)

    for (const [index, statement] of statements.entries()) {
      try {
        await sql.unsafe(statement)
      }
      catch (error) {
        console.error(`\n${entry.tag} failed on statement ${index + 1}:\n${statement}\n`)
        throw error
      }
    }

    if (entry.tag === '0011_preserve_data_uuid_keys') {
      await assertUuidMigrationResult()
    }

    await recordApplied(entry, hash)
    console.log(`Applied ${entry.tag}`)
  }
}
catch (error) {
  const failure = error as Error & { code?: string, detail?: string, hint?: string }
  console.error('Migration run failed')
  console.error('  message:', failure.message)
  if (failure.code) console.error('  code:', failure.code)
  if (failure.detail) console.error('  detail:', failure.detail)
  if (failure.hint) console.error('  hint:', failure.hint)
  process.exitCode = 1
}
finally {
  await sql.end()
}
