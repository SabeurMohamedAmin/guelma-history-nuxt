// Migrate only the isolated integration-test database.
// This wrapper prevents accidental migration of the application database.
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
