import { pgTable, text, uuid } from 'drizzle-orm/pg-core'

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  slug: text('slug').notNull().unique(),
})
