import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.NUXT_TEST_DATABASE_URL?.trim()
const describeWithDatabase = databaseUrl ? describe : describe.skip

/** Database-backed coverage for retry-safe Flutter article saves. */
describeWithDatabase('MobileArticleSaveIdempotencyRepository', () => {
  let sql: ReturnType<typeof postgres>
  let repository: typeof import('~~/server/repositories/mobile-article-save-idempotency.repository').mobileArticleSaveIdempotencyRepository
  const userId = randomUUID()
  const articleId = randomUUID()
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
    await sql`
      INSERT INTO articles (
        id, title_ar, title_fr, slug, body_ar, body_fr,
        created_by_user_id, revision
      ) VALUES (
        ${articleId}, 'عنوان', 'Titre', ${`integration-${articleId}`},
        'نص', 'Texte', ${userId}, 1
      )
    `

    const module = await import('~~/server/repositories/mobile-article-save-idempotency.repository')
    repository = module.mobileArticleSaveIdempotencyRepository
  })

  afterAll(async () => {
    if (!sql) return
    // Removing the article first also cascade-cleans its save-idempotency rows.
    await sql`DELETE FROM articles WHERE id = ${articleId}`
    await sql`DELETE FROM users WHERE id = ${userId}`
    await sql.end()
  })

  it('allows exactly one concurrent claim for a retry key', async () => {
    const claims = await Promise.all([
      repository.claim(userId, articleId, key, 'canonical-save-hash'),
      repository.claim(userId, articleId, key, 'canonical-save-hash'),
    ])

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claims.filter(claimed => !claimed)).toHaveLength(1)
  })

  it('persists the first response for safe retry replay', async () => {
    const response = { data: { id: articleId, revision: 2 } }
    await repository.complete(userId, key, response)

    const stored = await repository.find(userId, key)
    expect(stored?.articleId).toBe(articleId)
    expect(stored?.requestHash).toBe('canonical-save-hash')
    expect(JSON.parse(stored?.responseJson ?? 'null')).toEqual(response)
  })

  it('does not replace a claim when the key is reused for another payload', async () => {
    const claimed = await repository.claim(userId, articleId, key, 'different-save-hash')
    expect(claimed).toBe(false)

    const stored = await repository.find(userId, key)
    expect(stored?.requestHash).toBe('canonical-save-hash')
  })
})
