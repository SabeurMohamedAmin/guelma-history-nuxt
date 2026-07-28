import { pgTable, uuid, integer, text, timestamp, index } from 'drizzle-orm/pg-core'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { users } from './users'

/**
 * Realtime, threaded article comments.
 *
 * This is the modern, account-backed comment system (user/author/admin can
 * post; guests are read-only). It is deliberately SEPARATE from the legacy
 * `article_comments` table, which is an unauthenticated name+email contact form
 * with a moderation queue. Do not merge the two.
 *
 * Threading model
 * ---------------
 * `parentId` is the tree edge: NULL means a top-level (root) comment, otherwise
 * it points at the comment being replied to. Replies can nest to unlimited
 * depth.
 *
 * To keep ancestor/descendant lookups (deep-linking ?comment=123, the
 * "re-rooting" focus view, collapse/expand) cheap WITHOUT recursive CTEs on
 * every request, we maintain two denormalized fields alongside `parentId`:
 *
 * - `path`  : materialized path of ancestor ids, slash-joined and ending with
 *             this comment's own id, e.g. a reply with id 57 under 14 under 1
 *             has path "1/14/57". Descendants of comment 14 are then a simple
 *             `path LIKE '%/14/%' OR path LIKE '14/%'` (we store with a leading
 *             id, so prefix match `path LIKE '1/14/%'` finds the subtree).
 * - `depth` : number of ancestors (0 for a root). Drives indentation and the
 *             visual-cap / re-root decision on the client.
 *
 * Both are computed once on insert from the parent and never change (a comment
 * is never re-parented), so they cannot drift.
 *
 * Soft delete
 * -----------
 * Deleting a comment that still has replies must NOT remove the row, or the
 * whole branch below it would vanish. Instead we set `status = 'deleted'`,
 * blank the body on read, and render a "[deleted]" placeholder while keeping
 * the node (and therefore the thread) intact. `deletedAt` records when.
 */
export const comments = pgTable('comments', {
  // UUID primary key (gen_random_uuid). Chosen over a serial so a comment id is
  // not a guessable, enumerable counter: it does not leak how many comments
  // exist and cannot be walked by incrementing the value in a URL/deep link.
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  // The comment this one replies to. NULL = top-level. Self-reference; deleting
  // a parent cascades to its replies at the DB level, but in practice we soft
  // delete (status) so the subtree survives. Cascade is the hard-delete safety net.
  // The return type is annotated because the column points back at this very
  // table: without it TypeScript cannot infer `comments` while still building
  // it, falls back to `any`, and every db.query relation loses its types.
  parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  // The account that wrote the comment. Guests cannot post, so this is required.
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Raw, untrusted text exactly as typed. NEVER rendered as HTML: the client
  // interpolates it as text (auto-escaped) and the server sanitizes before
  // broadcasting. Length is enforced by the validator (1..1200), not the DB.
  body: text('body').notNull(),
  // 'active'  : normal, visible comment.
  // 'deleted' : soft-deleted; body hidden behind a "[deleted]" placeholder but
  //             the node is kept so child replies and thread shape survive.
  status: text('status', { enum: ['active', 'deleted'] }).notNull().default('active'),
  // Materialized ancestor path ending in this id, e.g. "1/14/57". See file docs.
  path: text('path').notNull().default(''),
  // Number of ancestors; 0 for a root comment. Cached for indentation/re-root.
  depth: integer('depth').notNull().default(0),
  // Denormalized vote tallies so sorting (Top/Controversial) and rendering do
  // not aggregate comment_votes on every read. Kept in sync inside the same
  // transaction as the vote write. `score` = upvotes - downvotes, indexed for Top.
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  score: integer('score').notNull().default(0),
  // Null until the first edit; set to the edit time afterwards. Drives the
  // "(edited)" label and its tooltip timestamp on the client.
  editedAt: timestamp('edited_at', { withTimezone: true, mode: 'date' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // Listing a thread: all comments for one article, newest first.
  index('comments_article_created_idx').on(table.articleId, table.createdAt),
  // Fetching the replies of a given comment (collapse/expand, re-root).
  index('comments_parent_idx').on(table.parentId),
  // Top sort: highest score within an article.
  index('comments_article_score_idx').on(table.articleId, table.score),
  // Subtree / ancestor queries via materialized path prefix match.
  index('comments_path_idx').on(table.path),
])
