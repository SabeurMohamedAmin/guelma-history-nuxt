import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.NUXT_TEST_DATABASE_URL?.trim()
const describeWithDatabase = databaseUrl ? describe : describe.skip

/** Database-backed coverage for concurrent Flutter upload retries. */
describeWithDatabase('MobileUploadIdempotencyRepository', () => {
  let sql: ReturnType<typeof postgres>
  let repository: typeof import('~~/server/repositories/mobile-upload-idempotency.repository').mobileUploadIdempotencyRepository
  const userId = randomUUID()
  const key = randomUUID()

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl
    sql = postgres(databaseUrl!, { prepare: false, max: 4 })

    await sql`
      INSERT INTO users (
        id, username, email, password_hash, profile_completed,
        email_verified_at, role
      ) VALUES (
        ${userId}, ${`integration-${userId}`}, ${`${userId}@example.test`},
        ${'integration-test-only'}, true, now(), 'admin'
      )
    `

    const module = await import('~~/server/repositories/mobile-upload-idempotency.repository')
    repository = module.mobileUploadIdempotencyRepository
  })

  afterAll(async () => {
    if (!sql) return
    await sql`DELETE FROM users WHERE id = ${userId}`
    await sql.end()
  })

  it('allows exactly one concurrent claim and persists its response', async () => {
    const claims = await Promise.all([
      repository.claim(userId, key, 'same-file-hash'),
      repository.claim(userId, key, 'same-file-hash'),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.filter(claimed => !claimed)).toHaveLength(1)

    const response = { data: { mediaId: 'test-media-id' } }
    await repository.complete(userId, key, response)

    const stored = await repository.find(userId, key)
    expect(stored?.requestHash).toBe('same-file-hash')
    expect(JSON.parse(stored?.responseJson ?? 'null')).toEqual(response)
  })

  it('keeps the original request hash when a key is reused for other bytes', async () => {
    const claimed = await repository.claim(userId, key, 'different-file-hash')
    expect(claimed).toBe(false)

    const stored = await repository.find(userId, key)
    expect(stored?.requestHash).toBe('same-file-hash')
  })
})
