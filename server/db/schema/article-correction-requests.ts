import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { articles } from './articles'

export const articleCorrectionRequests = pgTable('article_correction_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  section: text('section'),
  message: text('message').notNull(),
  status: text('status', { enum: ['open', 'reviewed', 'resolved'] }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
