import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { articles } from './articles'

export const articleComments = pgTable('article_comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
