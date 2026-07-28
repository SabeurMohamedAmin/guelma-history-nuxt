import { commentIdSchema } from '~~/server/validators/comment.validator'
import { deleteComment, getArticleSlug, serializeComment } from '~~/server/utils/comments'
import { publishCommentEvent } from '~~/server/utils/commentBroadcast'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Soft-delete a comment. Owner or admin only. Returns the serialized comment so
 * the client can swap it for the [deleted] placeholder while keeping the node.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))

    const deleted = await deleteComment(event, id)
    const data = serializeComment(deleted)
    // Rooms are keyed by slug; resolve it from the comment's article id.
    const articleSlug = await getArticleSlug(deleted.articleId)
    if (articleSlug) publishCommentEvent(articleSlug, { type: 'deleted', comment: data })
    return { success: true, data }
  }
  catch (error) {
    return toH3Error(error)
  }
})
