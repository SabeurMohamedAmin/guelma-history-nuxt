import { pgTable, text, serial } from 'drizzle-orm/pg-core'

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  slug: text('slug').notNull().unique(),
})
