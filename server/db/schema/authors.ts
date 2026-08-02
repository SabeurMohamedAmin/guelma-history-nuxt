import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core'

export const authors = pgTable('authors', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  // URL-safe identifier used to address an author in admin routes.
  // Generated from name_fr on create; kept unique across all authors.
  slug: text('slug').notNull().unique(),
  bioAr: text('bio_ar'),
  bioFr: text('bio_fr'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
