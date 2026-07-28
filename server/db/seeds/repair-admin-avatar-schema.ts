import postgres from 'postgres'

try {
  process.loadEnvFile?.()
}
catch {
  // DATABASE_URL may already come from the shell or deployment runtime.
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to .env or your shell before running this script.')
}

const sql = postgres(connectionString, { prepare: false, max: 1 })

async function repairAdminAvatarSchema() {
  await sql.begin(async (tx) => {
    await tx`ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "avatar_data" bytea`
    await tx`ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "avatar_mime_type" text`
    await tx`ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "avatar_updated_at" timestamp with time zone`
  })

  console.log('✅ Admin avatar columns are ready.')
}

repairAdminAvatarSchema()
  .catch((error) => {
    console.error('❌ Failed to repair admin avatar schema:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
