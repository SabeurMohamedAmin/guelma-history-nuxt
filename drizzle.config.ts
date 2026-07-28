import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // CockroachDB connection string (PostgreSQL wire protocol).
    // Same URL as the app runtime: port 26257, sslmode=verify-full.
    url: process.env.NUXT_DATABASE_URL!,
  },
})
