import { pgTable, text, uuid, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import type { ImageVariants } from '../../../shared/types/article'
import { categories } from './categories'
import { authors } from './authors'
import { users } from './users'

export const articles = pgTable('articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  titleAr: text('title_ar').notNull(),
  titleFr: text('title_fr').notNull(),
  slug: text('slug').notNull().unique(),
  excerptAr: text('excerpt_ar'),
  excerptFr: text('excerpt_fr'),
  // Localized bodies: each language has its own content (no shared body).
  bodyAr: text('body_ar').notNull().default(''),
  bodyFr: text('body_fr').notNull().default(''),
  coverImage: text('cover_image'),
  // Cards, sliders and article pages select the matching generated variant;
  // focus mode uses the untouched original.
  coverImageVariants: jsonb('cover_image_variants').$type<ImageVariants>(),
  // 0 is the main home-page story; 1..3 are the three supporting stories.
  // Null means the article is not curated for the home-page hero.
  homePosition: integer('home_position'),
  categoryId: uuid('category_id').references(() => categories.id),
  // Editorial byline (display only): whose name appears on the article. May be
  // shared across accounts or set by an admin to any author. NOT an owner.
  authorId: uuid('author_id').references(() => authors.id),
  // Ownership (authorization): the user account that created this article. Drives
  // the "authors edit/delete only their own" rule (admins bypass via role).
  // NOT NULL: every article has a creator. RESTRICT: a user with articles can't
  // be deleted, so articles are never orphaned (unlike the SET NULL byline link).
  createdByUserId: uuid('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
  readingTime: integer('reading_time').default(0),
  // Engagement metrics. Power the 'popular' / 'hot' / 'commented' sorts and the
  // article card counters. Default to 0 so existing rows stay valid.
  viewCount: integer('view_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  // Optimistic concurrency token shared by Nuxt and Flutter editors.
  revision: integer('revision').notNull().default(1),
  // Server-owned save metadata. Clients cannot choose the actor or timestamp.
  lastSavedAt: timestamp('last_saved_at', { withTimezone: true, mode: 'date' }),
  lastSavedByUserId: uuid('last_saved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
