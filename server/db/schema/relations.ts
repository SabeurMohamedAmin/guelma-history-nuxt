import { relations } from 'drizzle-orm'
import { articles } from './articles'
import { categories } from './categories'
import { authors } from './authors'
import { users } from './users'
import { userOauthAccounts } from './user-oauth-accounts'
import { tags } from './tags'
import { articleTags } from './article-tags'
import { articleMedia } from './article-media'
import { articleComments } from './article-comments'
import { articleCorrectionRequests } from './article-correction-requests'
import { comments } from './comments'
import { commentVotes } from './comment-votes'
import { commentFlags } from './comment-flags'
import { notifications } from './notifications'
import { notificationMutes } from './notification-mutes'
import { bookmarks } from './bookmarks'
import { subscribers } from './subscribers'
import { newsletterArticleEmails } from './newsletter-article-emails'

/**
 * Drizzle relations.
 *
 * These power the relational query API (`db.query.articles.findMany({ with })`).
 * They are application-level only — the actual foreign keys live in the table
 * definitions. Without these, `with: { category, author, articleTags }` throws.
 */

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [articles.authorId],
    references: [authors.id],
  }),
  // The user account that created (owns) this article. Distinct from `author`
  // (the display byline): used for the per-author ownership authorization check.
  owner: one(users, {
    fields: [articles.createdByUserId],
    references: [users.id],
  }),
  articleTags: many(articleTags),
  media: many(articleMedia),
  comments: many(articleComments),
  correctionRequests: many(articleCorrectionRequests),
  newsletterEmails: many(newsletterArticleEmails),
  bookmarks: many(bookmarks),
}))

export const articleMediaRelations = relations(articleMedia, ({ one }) => ({
  article: one(articles, { fields: [articleMedia.articleId], references: [articles.id] }),
}))

export const articleCommentsRelations = relations(articleComments, ({ one }) => ({
  article: one(articles, { fields: [articleComments.articleId], references: [articles.id] }),
}))

// --- Realtime threaded comments -------------------------------------------

export const commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, { fields: [comments.articleId], references: [articles.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  // Self-reference: the comment being replied to, and this comment's replies.
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, { relationName: 'commentReplies' }),
  votes: many(commentVotes),
  flags: many(commentFlags),
}))

export const commentVotesRelations = relations(commentVotes, ({ one }) => ({
  comment: one(comments, { fields: [commentVotes.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentVotes.userId], references: [users.id] }),
}))

export const commentFlagsRelations = relations(commentFlags, ({ one }) => ({
  comment: one(comments, { fields: [commentFlags.commentId], references: [comments.id] }),
  reporter: one(users, { fields: [commentFlags.reporterId], references: [users.id] }),
}))

// --- Notifications ---------------------------------------------------------

export const notificationsRelations = relations(notifications, ({ one }) => ({
  // The user who sees the notification.
  recipient: one(users, { fields: [notifications.recipientId], references: [users.id] }),
  // The user whose action created it.
  actor: one(users, { fields: [notifications.actorId], references: [users.id] }),
  // Deep-link targets.
  article: one(articles, { fields: [notifications.articleId], references: [articles.id] }),
  comment: one(comments, { fields: [notifications.commentId], references: [comments.id] }),
}))

export const notificationMutesRelations = relations(notificationMutes, ({ one }) => ({
  user: one(users, { fields: [notificationMutes.userId], references: [users.id] }),
  article: one(articles, { fields: [notificationMutes.articleId], references: [articles.id] }),
  comment: one(comments, { fields: [notificationMutes.commentId], references: [comments.id] }),
}))

// --- Newsletter ------------------------------------------------------------

export const subscribersRelations = relations(subscribers, ({ many }) => ({
  articleEmails: many(newsletterArticleEmails),
}))

export const newsletterArticleEmailsRelations = relations(newsletterArticleEmails, ({ one }) => ({
  article: one(articles, {
    fields: [newsletterArticleEmails.articleId],
    references: [articles.id],
  }),
  subscriber: one(subscribers, {
    fields: [newsletterArticleEmails.subscriberId],
    references: [subscribers.id],
  }),
}))

export const articleCorrectionRequestsRelations = relations(articleCorrectionRequests, ({ one }) => ({
  article: one(articles, { fields: [articleCorrectionRequests.articleId], references: [articles.id] }),
}))

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
  }),
  tag: one(tags, {
    fields: [articleTags.tagId],
    references: [tags.id],
  }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}))

export const authorsRelations = relations(authors, ({ many }) => ({
  articles: many(articles),
  // Accounts that write under this byline (a writing admin/author).
  users: many(users),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  // The editorial byline this account writes under, if any.
  author: one(authors, {
    fields: [users.authorId],
    references: [authors.id],
  }),
  // Articles created (owned) by this account. Powers the author's "My articles"
  // management list and the ownership check on edit/delete.
  articles: many(articles),
  // External identities (Facebook, ...) linked to this account.
  oauthAccounts: many(userOauthAccounts),
  // The user's saved articles (reading list).
  bookmarks: many(bookmarks),
}))

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  article: one(articles, { fields: [bookmarks.articleId], references: [articles.id] }),
}))

export const userOauthAccountsRelations = relations(userOauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [userOauthAccounts.userId],
    references: [users.id],
  }),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  articleTags: many(articleTags),
}))
