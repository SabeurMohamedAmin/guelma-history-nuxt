import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const databaseUrl = process.env.NUXT_TEST_DATABASE_URL?.trim()
const describeWithDatabase = databaseUrl ? describe : describe.skip

/** Database-backed optimistic-locking and autosave safety coverage. */
describeWithDatabase('ArticleRepository revisions', () => {
  let sql: ReturnType<typeof postgres>
  let repository: typeof import('~~/server/repositories/article.repository').articleRepository
  const userId = randomUUID()
  const articleId = randomUUID()

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

    const module = await import('~~/server/repositories/article.repository')
    repository = module.articleRepository
  })

  afterAll(async () => {
    if (!sql) return
    await sql`DELETE FROM users WHERE id = ${userId}`
    await sql.end()
  })

  it('accepts only one of two edits using the same revision', async () => {
    const updates = await Promise.all([
      repository.update(articleId, { titleAr: 'العنوان الأول' }, undefined, 1, userId),
      repository.update(articleId, { titleAr: 'العنوان الثاني' }, undefined, 1, userId),
    ])

    expect(updates.filter(Boolean)).toHaveLength(1)
    expect(updates.filter(updated => !updated)).toHaveLength(1)

    const [row] = await sql`
      SELECT revision, last_saved_by_user_id
      FROM articles WHERE id = ${articleId}
    `
    expect(row?.revision).toBe(2)
    expect(row?.last_saved_by_user_id).toBe(userId)
  })

  it('preserves bilingual draft content and increments once', async () => {
    const updated = await repository.update(articleId, {
      titleAr: 'عنوان محفوظ',
      titleFr: 'Titre sauvegardé',
      bodyAr: 'محتوى محفوظ',
      bodyFr: 'Contenu sauvegardé',
    }, undefined, 2, userId, true)

    expect(updated).toBe(true)

    const [row] = await sql`
      SELECT title_ar, title_fr, body_ar, body_fr, revision, published_at
      FROM articles WHERE id = ${articleId}
    `
    expect(row).toMatchObject({
      title_ar: 'عنوان محفوظ',
      title_fr: 'Titre sauvegardé',
      body_ar: 'محتوى محفوظ',
      body_fr: 'Contenu sauvegardé',
      revision: 3,
      published_at: null,
    })
  })

  it('refuses autosave after publication without changing content', async () => {
    await sql`UPDATE articles SET published_at = now() WHERE id = ${articleId}`

    const updated = await repository.update(articleId, {
      bodyFr: 'This must not be stored',
    }, undefined, 3, userId, true)

    expect(updated).toBe(false)

    const [row] = await sql`
      SELECT body_fr, revision FROM articles WHERE id = ${articleId}
    `
    expect(row?.body_fr).toBe('Contenu sauvegardé')
    expect(row?.revision).toBe(3)
  })
})
