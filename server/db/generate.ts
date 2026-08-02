import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const migrationsDir = fileURLToPath(new URL('./migrations/', import.meta.url))
const journalPath = join(migrationsDir, 'meta', '_journal.json')

interface JournalEntry {
  idx: number
  tag: string
}

const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
  entries: JournalEntry[]
}
const latest = journal.entries.at(-1)

if (!latest) {
  throw new Error('The migration journal has no entries.')
}

const snapshotName = `${String(latest.idx).padStart(4, '0')}_snapshot.json`
const snapshotPath = join(migrationsDir, 'meta', snapshotName)

if (!existsSync(snapshotPath)) {
  console.error(
    `Cannot generate another migration: ${snapshotName} is missing for ${latest.tag}.\n`
    + 'Generate and commit a UUID-aware snapshot for migration 0011 first. '
    + 'Running Drizzle against the older integer snapshot would generate a duplicate UUID conversion.',
  )
  process.exit(1)
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const result = spawnSync(command, ['exec', 'drizzle-kit', 'generate'], {
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
