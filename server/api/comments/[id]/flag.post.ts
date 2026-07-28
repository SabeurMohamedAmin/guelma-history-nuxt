import { commentIdSchema, flagCommentSchema } from '~~/server/validators/comment.validator'
import { flagComment } from '~~/server/utils/comments'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Report a comment for admin review. Requires a completed account. Idempotent:
 * a repeat report by the same user is a silent success.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))

    const { reason } = flagCommentSchema.parse(await readBody(event))
    const result = await flagComment(event, id, reason || undefined)
    return result
  }
  catch (error) {
    return toH3Error(error)
  }
})
