import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../schema'

/**
 * Standalone Drizzle client for seed scripts (run via `tsx`).
 *
 * Unlike the app runtime, seeds run outside Nuxt, so we load `.env` ourselves
 * (Node 20.12+ `process.loadEnvFile`) and open a tiny dedicated connection.
 * The connection string is read from NUXT_DATABASE_URL.
 * Always `await seedClient.end()` at the end of a script so the process exits.
 */
try {
  process.loadEnvFile?.()
}
catch {
  // .env is optional — DATABASE_URL may come from the shell instead.
}

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
  throw new Error('NUXT_DATABASE_URL is not set. Add it to .env or your shell before seeding.')
}

export const seedClient = postgres(connectionString, { prepare: false, max: 1 })
export const db = drizzle(seedClient, { schema })

// Re-export the Drizzle operators and schema tables the seeds use so that every
// seed resolves them through this single module. With pnpm, `drizzle-orm` can
// be installed as more than one peer-variant copy; importing `db`, operators
// and tables from one place guarantees they share the same instance and avoids
// cross-copy type mismatches.
export { eq } from 'drizzle-orm'
export * from '../schema'
