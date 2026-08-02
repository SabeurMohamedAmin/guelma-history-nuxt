import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import postgres from 'postgres'

try {
  process.loadEnvFile?.()
}
catch {
  // Environment variables may already be provided by the shell.
}

const connectionString = process.env.NUXT_DATABASE_URL?.trim()
const command = process.argv[2]
const backupPath = resolve(process.argv[3] || 'database-backups/before-uuid-rebuild.json')

if (!connectionString) throw new Error('NUXT_DATABASE_URL is not set.')

const tableOrder = [
  'authors',
  'categories',
  'users',
  'tags',
  'subscribers',
  'articles',
  'article_comments',
  'article_correction_requests',
  'article_media',
  'article_tags',
  'comments',
  'comment_votes',
  'comment_flags',
  'notification_mutes',
  'notifications',
  'bookmarks',
  'newsletter_article_emails',
  'contact_messages',
  'user_oauth_accounts',
  'password_reset_tokens',
] as const

type TableName = typeof tableOrder[number]
type Row = Record<string, unknown>
type Backup = { createdAt: string, tables: Partial<Record<TableName, Row[]>> }

const idPrefixes: Partial<Record<TableName, string>> = {
  authors: 'authors', categories: 'categories', users: 'users', tags: 'tags',
  subscribers: 'subscribers', articles: 'articles', article_comments: 'article_comments',
  article_correction_requests: 'article_correction_requests', article_media: 'article_media',
  comment_votes: 'comment_votes', comment_flags: 'comment_flags',
  notification_mutes: 'notification_mutes', bookmarks: 'bookmarks',
  newsletter_article_emails: 'newsletter_article_emails', contact_messages: 'contact_messages',
  user_oauth_accounts: 'user_oauth_accounts', password_reset_tokens: 'password_reset_tokens',
}

const foreignKeyPrefixes: Partial<Record<TableName, Record<string, string>>> = {
  categories: { parent_id: 'categories' },
  users: { author_id: 'authors' },
  articles: { category_id: 'categories', author_id: 'authors', created_by_user_id: 'users' },
  article_comments: { article_id: 'articles' },
  article_correction_requests: { article_id: 'articles' },
  article_media: { article_id: 'articles' },
  article_tags: { article_id: 'articles', tag_id: 'tags' },
  comments: { article_id: 'articles', author_id: 'users' },
  comment_votes: { user_id: 'users' },
  comment_flags: { reporter_id: 'users' },
  notification_mutes: { user_id: 'users', article_id: 'articles' },
  notifications: { recipient_id: 'users', actor_id: 'users', article_id: 'articles' },
  bookmarks: { user_id: 'users', article_id: 'articles' },
  newsletter_article_emails: { article_id: 'articles', subscriber_id: 'subscribers' },
  user_oauth_accounts: { user_id: 'users' },
  password_reset_tokens: { user_id: 'users' },
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function toUuid(prefix: string, value: unknown): unknown {
  if (value === null || value === undefined) return value

  const legacyId = String(value)
  if (!/^\d+$/.test(legacyId)) return value

  const hex = createHash('md5').update(`${prefix}:${legacyId}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function convertRow(table: TableName, source: Row): Row {
  const row = { ...source }
  const idPrefix = idPrefixes[table]
  if (idPrefix) row.id = toUuid(idPrefix, row.id)

  for (const [column, prefix] of Object.entries(foreignKeyPrefixes[table] || {})) {
    row[column] = toUuid(prefix, row[column])
  }

  return row
}

async function exportBackup(sql: postgres.Sql): Promise<void> {
  const backup: Backup = { createdAt: new Date().toISOString(), tables: {} }

  for (const table of tableOrder) {
    const exists = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS exists
    `
    if (!exists[0]?.exists) continue

    backup.tables[table] = await sql.unsafe(`SELECT * FROM ${quoteIdentifier(table)}`) as Row[]
    console.log(`Exported ${backup.tables[table]!.length} rows from ${table}.`)
  }

  await mkdir(dirname(backupPath), { recursive: true })
  await writeFile(backupPath, JSON.stringify(backup, null, 2), { mode: 0o600 })
  console.log(`Backup written to ${backupPath}`)
}

async function restoreBackup(sql: postgres.Sql): Promise<void> {
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as Backup

  await sql.begin(async transaction => {
    for (const table of tableOrder) {
      const rows = backup.tables[table] || []
      for (const source of rows) {
        const row = convertRow(table, source)
        const columns = Object.keys(row)
        const names = columns.map(quoteIdentifier).join(', ')
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
        await transaction.unsafe(
          `INSERT INTO ${quoteIdentifier(table)} (${names}) VALUES (${placeholders})`,
          columns.map(column => row[column]),
        )
      }
      console.log(`Restored ${rows.length} rows into ${table}.`)
    }
  })
}

function runMigrations(): void {
  const result = spawnSync('pnpm', ['db:migrate'], { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) throw new Error('Database migration failed. The backup has not been restored.')
}

async function resetDatabase(sql: postgres.Sql): Promise<void> {
  // CockroachDB owns and protects the public schema, so it cannot be dropped.
  // Remove every object inside it instead, including any tables added later.
  const tables = await sql<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `

  for (const { table_name: table } of tables) {
    await sql.unsafe(`DROP TABLE IF EXISTS ${quoteIdentifier('public')}.${quoteIdentifier(table)} CASCADE`)
  }

  // Clear the migration ledger so the empty database is rebuilt from 0000.
  await sql.unsafe(`DROP SCHEMA IF EXISTS ${quoteIdentifier('drizzle')} CASCADE`)
}

async function main(): Promise<void> {
  if (!['export', 'restore', 'rebuild', 'resume'].includes(command || '')) {
    throw new Error('Usage: pnpm db:uuid:rebuild <export|restore|rebuild|resume> [backup-file]')
  }

  let sql = postgres(connectionString!, { prepare: false, max: 1 })
  try {
    if (command === 'export') return await exportBackup(sql)
    if (command === 'restore') return await restoreBackup(sql)

    if (process.env.CONFIRM_DATABASE_REBUILD !== 'yes') {
      throw new Error('Rebuild deletes all public tables. Re-run with CONFIRM_DATABASE_REBUILD=yes.')
    }

    // Resume uses the existing backup after an interrupted rebuild. Exporting
    // here would overwrite it with rows from the partial/empty database.
    if (command === 'rebuild') await exportBackup(sql)
    else await readFile(backupPath, 'utf8')

    await resetDatabase(sql)
    await sql.end()

    runMigrations()
    sql = postgres(connectionString!, { prepare: false, max: 1 })
    await restoreBackup(sql)
    console.log('UUID database rebuild completed successfully.')
  }
  finally {
    await sql.end()
  }
}

await main()
