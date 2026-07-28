import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { tags } from './tags'

export const articleTags = pgTable('article_tags', {
  articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, table => ({
  pk: primaryKey({ columns: [table.articleId, table.tagId] }),
}))
