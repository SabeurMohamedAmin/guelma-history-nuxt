import { pgTable, text, uuid, timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  slug: text('slug').notNull().unique(),
  descriptionAr: text('description_ar'),
  descriptionFr: text('description_fr'),
  // Optional MDI icon name (e.g. 'mdi-castle') shown in the category header/grid.
  // When null, the UI falls back to the slug-based map in useCategoryIcon().
  icon: text('icon'),
  // Optional banner image for the category header.
  coverImage: text('cover_image'),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
