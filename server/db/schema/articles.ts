import { pgTable, text, serial, integer, timestamp } from 'drizzle-orm/pg-core'
import { categories } from './categories'
import { authors } from './authors'
import { users } from './users'

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  titleAr: text('title_ar').notNull(),
  titleFr: text('title_fr').notNull(),
  slug: text('slug').notNull().unique(),
  excerptAr: text('excerpt_ar'),
  excerptFr: text('excerpt_fr'),
  // Localized bodies: each language has its own content (no shared body).
  bodyAr: text('body_ar').notNull().default(''),
  bodyFr: text('body_fr').notNull().default(''),
  coverImage: text('cover_image'),
  categoryId: integer('category_id').references(() => categories.id),
  // Editorial byline (display only): whose name appears on the article. May be
  // shared across accounts or set by an admin to any author. NOT an owner.
  authorId: integer('author_id').references(() => authors.id),
  // Ownership (authorization): the user account that created this article. Drives
  // the "authors edit/delete only their own" rule (admins bypass via role).
  // NOT NULL: every article has a creator. RESTRICT: a user with articles can't
  // be deleted, so articles are never orphaned (unlike the SET NULL byline link).
  createdByUserId: integer('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
  readingTime: integer('reading_time').default(0),
  // Engagement metrics. Power the 'popular' / 'hot' / 'commented' sorts and the
  // article card counters. Default to 0 so existing rows stay valid.
  viewCount: integer('view_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
