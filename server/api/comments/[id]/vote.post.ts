import { commentIdSchema, voteCommentSchema } from '~~/server/validators/comment.validator'
import { getArticleSlug, voteComment } from '~~/server/utils/comments'
import { publishCommentEvent } from '~~/server/utils/commentBroadcast'
import { db } from '~~/server/db'
import { comments as commentsTable } from '~~/server/db/schema'
import { eq } from 'drizzle-orm'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Cast or toggle a vote on a comment. Requires a completed account. Returns the
 * fresh tallies and the viewer's resulting vote so the client can reconcile its
 * optimistic update.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))

    const { value } = voteCommentSchema.parse(await readBody(event))
    const result = await voteComment(event, id, value)

    // The vote result carries no article reference; resolve the comment's
    // article slug to target the right room (rooms are keyed by slug).
    const owner = await db.query.comments.findFirst({
      where: eq(commentsTable.id, id),
      columns: { articleId: true },
    })
    const articleSlug = owner ? await getArticleSlug(owner.articleId) : null
    if (articleSlug) {
      publishCommentEvent(articleSlug, {
        type: 'voted',
        vote: {
          commentId: result.commentId,
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          score: result.score,
        },
      })
    }

    return { success: true, data: result }
  }
  catch (error) {
    return toH3Error(error)
  }
})
