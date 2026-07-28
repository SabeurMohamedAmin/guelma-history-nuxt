import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Drizzle ORM connection singleton (CockroachDB — PostgreSQL wire protocol).
 *
 * The connection string comes from `NUXT_DATABASE_URL`. Get it from the
 * CockroachDB Cloud console: Cluster → Connect → "General connection string".
 * It looks like:
 *   postgresql[REDACTED]<cluster-host>:26257/defaultdb?sslmode=verify-full
 *
 * Keep `sslmode=verify-full` in the URL: CockroachDB Cloud requires TLS.
 * Its certificates are signed by a public CA, so Node.js needs no CA file.
 *
 * The connection is created LAZILY, on the first real query — not when this
 * module is imported. That way unit tests (and tooling) can import server
 * code that happens to `import { db }` without needing a database configured;
 * only code that actually talks to the database requires NUXT_DATABASE_URL.
 */
function createDb() {
  const connectionString = process.env.NUXT_DATABASE_URL?.trim()

  if (!connectionString) {
    throw new Error('NUXT_DATABASE_URL is not set. Add your CockroachDB connection string to the environment.')
  }

  let client: ReturnType<typeof postgres>

  try {
    client = postgres(connectionString, {
      max: 10, // handle parallel requests from dashboard/widgets without deadlock or bottlenecking
      idle_timeout: 20, // close idle connections after 20s
    })
  }
  catch (error) {
    // A common cause is unescaped special characters in the password. Some env
    // loaders also expand `$`, corrupting the value. Percent-encode special chars
    // (e.g. $ -> %24, @ -> %40, # -> %23) and wrap the URL in double quotes.
    throw new Error(
      `Failed to parse NUXT_DATABASE_URL. If your password contains special characters `
      + `(@ : / ? # & $ or spaces), percent-encode them and quote NUXT_DATABASE_URL in .env. `
      + `Original error: ${(error as Error).message}`,
    )
  }

  return drizzle(client, { schema })
}

type Db = ReturnType<typeof createDb>

/** The real instance, created once on first access (see proxy below). */
let instance: Db | undefined

/**
 * Lazy proxy around the drizzle instance. Any property access (`db.query`,
 * `db.transaction`, ...) creates the real connection on first use and then
 * delegates to it. Callers keep the exact same `db.xxx` API as before.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb()
    const value = Reflect.get(instance, prop)
    // Bind methods to the real instance so `this` inside drizzle stays correct.
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
