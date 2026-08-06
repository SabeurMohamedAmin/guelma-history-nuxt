import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.NUXT_TEST_DATABASE_URL?.trim()
const describeWithDatabase = databaseUrl ? describe : describe.skip

/** Database-backed coverage for the mobile abandoned-media cleanup guard. */
describeWithDatabase('ArticleRepository media references', () => {
  let sql: ReturnType<typeof postgres>
  let repository: typeof import('~~/server/repositories/article.repository').articleRepository
  const userId = randomUUID()
  const articleId = randomUUID()
  const mediaId = randomUUID()
  const referencedPublicId = `integration/${randomUUID()}`
  const unreferencedPublicId = `integration/${randomUUID()}`

  beforeAll(async () => {
    process.env.NUXT_DATABASE_URL = databaseUrl
    sql = postgres(databaseUrl!, { prepare: false, max: 2 })

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
    await sql`
      INSERT INTO article_media (
        id, article_id, type, url, public_id, resource_type, position
      ) VALUES (
        ${mediaId}, ${articleId}, 'image', 'https://example.test/image.webp',
        ${referencedPublicId}, 'image', 0
      )
    `

    const module = await import('~~/server/repositories/article.repository')
    repository = module.articleRepository
  })

  afterAll(async () => {
    if (!sql) return
    // Delete media explicitly, then the article, because article ownership uses
    // RESTRICT and must never be bypassed by test cleanup assumptions.
    await sql`DELETE FROM article_media WHERE id = ${mediaId}`
    await sql`DELETE FROM articles WHERE id = ${articleId}`
    await sql`DELETE FROM users WHERE id = ${userId}`
    await sql.end()
  })

  it('recognizes media attached to an article', async () => {
    await expect(repository.isMediaPublicIdReferenced(referencedPublicId)).resolves.toBe(true)
  })

  it('allows cleanup consideration for an unreferenced public id', async () => {
    await expect(repository.isMediaPublicIdReferenced(unreferencedPublicId)).resolves.toBe(false)
  })
})
