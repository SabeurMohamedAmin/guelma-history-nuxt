import { index, integer, pgTable, serial, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { subscribers } from './subscribers'

/**
 * Sent newsletter article emails.
 *
 * One row = one published article alert sent to one subscriber.
 *
 * The unique `(articleId, subscriberId)` index is the duplicate-send guard. If a
 * publish event is triggered twice, or a job is retried, the newsletter domain
 * can safely check/insert this row and avoid emailing the same subscriber about
 * the same article more than once.
 */
export const newsletterArticleEmails = pgTable('newsletter_article_emails', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  subscriberId: integer('subscriber_id')
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  uniqueIndex('newsletter_article_emails_article_subscriber_uidx').on(table.articleId, table.subscriberId),
  index('newsletter_article_emails_article_idx').on(table.articleId),
  index('newsletter_article_emails_subscriber_idx').on(table.subscriberId),
])
