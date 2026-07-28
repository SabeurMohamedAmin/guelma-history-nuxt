// server/api/home.get.ts
//
// Single endpoint powering the entire home page.
// The three queries run in parallel via Promise.all, so total latency is
// max(q1, q2, q3) instead of q1 + q2 + q3 (the old page made 3 serial calls).
//
// Article rows use the SAME flattened shape as
// GET /api/categories/:slug/articles so that <ArticleCard> receives a
// consistent ArticleListItem on both the home and category pages.

import { desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { authors } from '~~/server/db/schema/authors'

// Shared column selection — keeps the two article queries DRY and guarantees
// they return an identical shape.
const ARTICLE_LIST_COLUMNS = {
  id: articles.id,
  titleAr: articles.titleAr,
  titleFr: articles.titleFr,
  slug: articles.slug,
  coverImage: articles.coverImage,
  publishedAt: articles.publishedAt,
  readingTime: articles.readingTime,
  viewCount: articles.viewCount,
  commentCount: articles.commentCount,
  excerptAr: articles.excerptAr,
  excerptFr: articles.excerptFr,
  categorySlug: categories.slug,
  categoryNameAr: categories.nameAr,
  categoryNameFr: categories.nameFr,
  authorNameAr: authors.nameAr,
  authorNameFr: authors.nameFr,
} as const

export default defineEventHandler(async () => {
  const publishedOnly = isNotNull(articles.publishedAt)

  const [featured, recent, cats] = await Promise.all([
    // Hero carousel: 4 most-recently published articles.
    db
      .select(ARTICLE_LIST_COLUMNS)
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(authors, eq(articles.authorId, authors.id))
      .where(publishedOnly)
      .orderBy(desc(articles.publishedAt))
      .limit(4),

    // Main list: 8 most-recently published articles.
    db
      .select(ARTICLE_LIST_COLUMNS)
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(authors, eq(articles.authorId, authors.id))
      .where(publishedOnly)
      .orderBy(desc(articles.publishedAt))
      .limit(8),

    // Filter tabs: all categories with their article counts.
    // Mirrors GET /api/categories exactly.
    db
      .select({
        id: categories.id,
        nameAr: categories.nameAr,
        nameFr: categories.nameFr,
        slug: categories.slug,
        descriptionAr: categories.descriptionAr,
        descriptionFr: categories.descriptionFr,
        icon: categories.icon,
        coverImage: categories.coverImage,
        parentId: categories.parentId,
        articleCount: sql<number>`count(${articles.id})`,
      })
      .from(categories)
      .leftJoin(articles, eq(articles.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(categories.nameAr),
  ])

  return {
    featured,
    articles: recent,
    categories: cats,
  }
})
