import { commentIdSchema, editCommentSchema } from '~~/server/validators/comment.validator'
import { editComment, getArticleSlug, serializeComment } from '~~/server/utils/comments'
import { publishCommentEvent } from '~~/server/utils/commentBroadcast'
import { toH3Error } from '~~/server/utils/handleError'

/** Edit a comment body. Owner or admin only; stamps editedAt. */
export default defineEventHandler(async (event) => {
  try {
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))

    const { body } = editCommentSchema.parse(await readBody(event))
    const updated = await editComment(event, id, body)
    const data = serializeComment(updated)
    // Rooms are keyed by slug; resolve it from the comment's article id.
    const articleSlug = await getArticleSlug(updated.articleId)
    if (articleSlug) publishCommentEvent(articleSlug, { type: 'updated', comment: data })
    return { success: true, data }
  }
  catch (error) {
    return toH3Error(error)
  }
})
