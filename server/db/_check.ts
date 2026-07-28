/* Temporary connectivity probe. Safe to delete. */
import postgres from 'postgres'

try {
  process.loadEnvFile?.()
}
catch { /* .env optional */ }

const url = process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error('NUXT_DATABASE_URL is not set')
  process.exit(1)
}

try {
  const u = new URL(url)
  console.log(`Connecting to host=${u.hostname} port=${u.port} user=${u.username} db=${u.pathname.slice(1)}`)
}
catch {
  console.log('DATABASE_URL is not a parseable URL')
}

const sql = postgres(url, { prepare: false, max: 1 })

try {
  const rows = await sql`select current_database() as db, current_user as usr, version() as version`
  console.log('✅ Connected OK:', rows[0])
}
catch (e) {
  const err = e as Error & { code?: string, errno?: number, cause?: unknown }
  console.error('❌ Connection/query failed')
  console.error('  message:', err.message)
  if (err.code) console.error('  code:', err.code)
  if (err.cause) console.error('  cause:', err.cause)
}
finally {
  await sql.end()
}
