// Migrate only the isolated integration-test database.
// This wrapper prevents accidental migration of the application database.
//
// The empty export makes this file a module, which is what allows the top level
// `await` at the end. Without it TypeScript reports TS1375, because a script
// with no imports or exports cannot use top level await. The import must stay
// dynamic and last, so it runs only after the environment is rewritten below.
export {}

const testDatabaseUrl = process.env.NUXT_TEST_DATABASE_URL
const applicationDatabaseUrl = process.env.NUXT_DATABASE_URL

if (!testDatabaseUrl) {
  console.error('NUXT_TEST_DATABASE_URL is not set.')
  process.exit(1)
}

if (applicationDatabaseUrl && testDatabaseUrl === applicationDatabaseUrl) {
  console.error('Refusing to migrate: test and application database URLs are identical.')
  process.exit(1)
}

process.env.NUXT_DATABASE_URL = testDatabaseUrl

await import('./migrate')
