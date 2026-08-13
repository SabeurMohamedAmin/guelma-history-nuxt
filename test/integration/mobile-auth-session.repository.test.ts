import { randomBytes, randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.NUXT_TEST_DATABASE_URL?.trim()
const describeWithDatabase = databaseUrl ? describe : describe.skip

/**
 * Opt-in database integration coverage. This deliberately never falls back to
 * NUXT_DATABASE_URL, preventing accidental writes to an application database.
 */
describeWithDatabase('MobileAuthSessionRepository rotation', () => {
  let sql: ReturnType<typeof postgres>
  let repository: typeof import('~~/server/repositories/mobile-auth-session.repository').mobileAuthSessionRepository
  const userId = randomUUID()
  const familyId = randomUUID()
  const firstHash = randomBytes(32).toString('hex')

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

    const module = await import('~~/server/repositories/mobile-auth-session.repository')
    repository = module.mobileAuthSessionRepository
    await repository.create({
      userId,
      tokenHash: firstHash,
      tokenFamilyId: familyId,
      deviceId: `integration-${userId}`,
      platform: 'android',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }, 5)
  })

  afterAll(async () => {
    if (!sql) return
    await sql`DELETE FROM users WHERE id = ${userId}`
    await sql.end()
  })

  it('allows one concurrent rotation and revokes the winner after reuse', async () => {
    const attempts = await Promise.allSettled([
      repository.rotate({
        currentTokenHash: firstHash,
        nextTokenHash: randomBytes(32).toString('hex'),
        nextExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
      repository.rotate({
        currentTokenHash: firstHash,
        nextTokenHash: randomBytes(32).toString('hex'),
        nextExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    ])

    const results = attempts.map((attempt) => {
      if (attempt.status === 'rejected') throw attempt.reason
      return attempt.value
    })

    expect(results.filter(result => result.status === 'rotated')).toHaveLength(1)
    expect(results.filter(result => result.status === 'reuse-detected')).toHaveLength(1)

    const activeFamilyRows = await sql`
      SELECT id FROM mobile_admin_sessions
      WHERE token_family_id = ${familyId} AND revoked_at IS NULL
    `
    expect(activeFamilyRows).toHaveLength(0)
  })
})
