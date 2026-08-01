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

  it('registers the data-preserving UUID conversion after the integer migrations', () => {
    const uuidEntry = journal.entries.find(entry => entry.tag === '0011_preserve_data_uuid_keys')
    expect(uuidEntry).toBeDefined()
    expect(uuidEntry?.idx).toBe(11)
    expect(allSql).toContain('SET DATA TYPE UUID')
    expect(allSql).toContain('SET DEFAULT gen_random_uuid()')
  })
})
