import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { getTableColumns, getTableName, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import * as schema from '~~/server/db/schema'

/**
 * Guards the migration chain itself — the layer no other unit test can reach.
 *
 * Drizzle applies `meta/_journal.json` entries in array order and stops at the
 * first failing statement, so ONE bad entry silently leaves every later table
 * missing. That is exactly how `bookmarks` ended up absent (a duplicated
 * ALTER TABLE aborted the run before `0007` could create it), which surfaced
 * only at runtime as a 500 from POST /api/articles/:slug/bookmark.
 *
 * No database and no network here: everything is derived from the files on disk
 * plus the Drizzle schema, so it runs in the plain-node `unit` project.
 */

const migrationsDir = fileURLToPath(new URL('../../../server/db/migrations/', import.meta.url))

interface JournalEntry {
  idx: number
  when: number
  tag: string
}

const journal = JSON.parse(
  readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf8'),
) as { entries: JournalEntry[] }

const sqlFileNames = readdirSync(migrationsDir).filter(name => name.endsWith('.sql'))

/** Every migration's SQL, concatenated — used for "is this table created?" checks. */
const allSql = sqlFileNames
  .map(name => readFileSync(join(migrationsDir, name), 'utf8'))
  .join('\n')

/** Table names as they exist in Postgres, read straight from the schema exports. */
const schemaTables = Object.values(schema).filter(value => is(value, PgTable))
const tableNames = schemaTables.map(table => getTableName(table))

/** Collapse whitespace so formatting alone never hides two identical migrations. */
function normalise(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

describe('migration journal', () => {
  it('points at a SQL file that exists for every entry', () => {
    for (const entry of journal.entries) {
      expect(sqlFileNames, `${entry.tag}.sql is missing`).toContain(`${entry.tag}.sql`)
    }
  })

  it('lists every SQL file in the folder (no migration is silently skipped)', () => {
    const expected = journal.entries.map(entry => `${entry.tag}.sql`).sort()
    expect([...sqlFileNames].sort()).toEqual(expected)
  })

  it('has no duplicate tags', () => {
    const tags = journal.entries.map(entry => entry.tag)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('runs entries in timestamp order', () => {
    journal.entries.forEach((entry, index) => {
      const previous = journal.entries[index - 1]
      if (!previous) return
      expect(
        entry.when,
        `${entry.tag} runs after ${previous.tag} but has an older timestamp`,
      ).toBeGreaterThan(previous.when)
    })
  })
})

describe('migration files', () => {
  it('uses no PL/pgSQL DO blocks (CockroachDB does not implement DO)', () => {
    for (const name of sqlFileNames) {
      const sql = readFileSync(join(migrationsDir, name), 'utf8')
      expect(sql, `${name} uses a DO block`).not.toContain('DO $$')
    }
  })

  it('never repeats the same SQL twice (a replayed ALTER aborts the run)', () => {
    const seenBefore = new Map<string, string>()

    for (const entry of journal.entries) {
      const sql = normalise(readFileSync(join(migrationsDir, `${entry.tag}.sql`), 'utf8'))
      const twin = seenBefore.get(sql)
      expect(twin, `${entry.tag}.sql is identical to ${twin}.sql`).toBeUndefined()
      seenBefore.set(sql, entry.tag)
    }
  })

  it('runs the UUID conversion atomically and manages the article_tags schema lock', () => {
    const runner = readFileSync(join(migrationsDir, '..', 'migrate.ts'), 'utf8')

    expect(runner).toContain('entry.tag === \'0011_preserve_data_uuid_keys\'')
    expect(runner).toContain('await sql.begin(async (transaction) =>')
    expect(runner).toContain('SET LOCAL autocommit_before_ddl = false')
    expect(runner).toContain("'article_tags'")
    expect(runner).toContain('ALTER TABLE ${table} SET (schema_locked = false)')
    expect(runner).toContain('ALTER TABLE ${table} SET (schema_locked = true)')
  })
})

describe('schema coverage', () => {
  it.each(tableNames)('creates the "%s" table in a migration', (tableName) => {
    expect(allSql).toMatch(new RegExp(`CREATE TABLE (IF NOT EXISTS )?"${tableName}"`))
  })

  it('uses UUIDs for every single-column id primary key', () => {
    for (const table of schemaTables) {
      const id = getTableColumns(table).id
      if (!id) continue

      expect(id.dataType, `${getTableName(table)}.id must be a UUID string`).toBe('string')
      expect(id.columnType, `${getTableName(table)}.id must use PgUUID`).toBe('PgUUID')
      expect(id.primary, `${getTableName(table)}.id must remain the primary key`).toBe(true)
      expect(id.hasDefault, `${getTableName(table)}.id must generate UUIDs by default`).toBe(true)
    }
  })

  it('uses UUIDs for every database relationship id', () => {
    for (const table of schemaTables) {
      const tableName = getTableName(table)

      for (const [propertyName, column] of Object.entries(getTableColumns(table))) {
        // Relationship properties consistently end in `Id`. The plain `id`
        // primary key is covered separately above. Provider and Cloudinary
        // public IDs are external opaque strings, not database relationships.
        if (
          !propertyName.endsWith('Id')
          || propertyName === 'providerUserId'
          || propertyName === 'publicId'
        ) continue

        expect(
          column.columnType,
          `${tableName}.${column.name} must use PgUUID`,
        ).toBe('PgUUID')
      }
    }
  })

  it('creates every UUID relationship directly in the migration chain', () => {
    for (const table of schemaTables) {
      const tableName = getTableName(table)

      for (const [propertyName, column] of Object.entries(getTableColumns(table))) {
        if (
          !propertyName.endsWith('Id')
          || propertyName === 'providerUserId'
          || propertyName === 'publicId'
        ) continue

        expect(
          allSql,
          `${tableName}.${column.name} must be created as UUID`,
        ).toMatch(new RegExp(`"${column.name}"\\s+uuid(?:\\s|,|\\))`, 'i'))
      }
    }
  })

  it('creates every UUID primary key with a random UUID default', () => {
    for (const table of schemaTables) {
      const id = getTableColumns(table).id
      if (!id) continue

      const tableName = getTableName(table)
      const createTable = allSql.match(
        new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?"${tableName}" \\([\\s\\S]*?\\n\\);`, 'i'),
      )?.[0]

      expect(createTable, `${tableName} must have a CREATE TABLE migration`).toBeDefined()
      expect(createTable).toMatch(
        /"id"\s+uuid\s+PRIMARY KEY\s+DEFAULT gen_random_uuid\(\)/i,
      )
    }
  })

  it('does not install serial defaults on UUID columns', () => {
    const uuidMigration = readFileSync(
      join(migrationsDir, '0011_preserve_data_uuid_keys.sql'),
      'utf8',
    )

    expect(uuidMigration).not.toMatch(/SET DEFAULT nextval/i)
    expect(uuidMigration).not.toMatch(/SET DATA TYPE (?:SERIAL|INTEGER|BIGINT)/i)
  })

  it('keeps the retired UUID conversion registered as a compatibility entry', () => {
    const uuidEntry = journal.entries.find(entry => entry.tag === '0011_preserve_data_uuid_keys')
    const migration = readFileSync(
      join(migrationsDir, '0011_preserve_data_uuid_keys.sql'),
      'utf8',
    )

    expect(uuidEntry).toBeDefined()
    expect(uuidEntry?.idx).toBe(11)
    expect(migration).toContain('Fresh databases now create UUID columns directly')
    expect(migration).toContain('SELECT 1;')
    expect(migration).not.toContain('SET DATA TYPE UUID')
  })

  it('guards migration generation from a stale pre-UUID snapshot', () => {
    const latestEntry = journal.entries.at(-1)
    expect(latestEntry?.tag).toBe('0011_preserve_data_uuid_keys')

    const generator = readFileSync(
      join(migrationsDir, '..', 'generate.ts'),
      'utf8',
    )
    expect(generator).toContain('existsSync(snapshotPath)')
    expect(generator).toContain('spawnSync(command, [\'exec\', \'drizzle-kit\', \'generate\']')

    const packageJson = JSON.parse(
      readFileSync(join(migrationsDir, '..', '..', '..', 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> }
    expect(packageJson.scripts['db:generate']).toBe('tsx server/db/generate.ts')
  })
})
