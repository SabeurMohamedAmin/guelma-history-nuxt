import { requireAdmin } from '~~/server/utils/auth'
import { commentIdSchema } from '~~/server/validators/comment.validator'
import { resolveCommentFlags } from '~~/server/utils/comments'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * POST /api/admin/comments/flags/:id/resolve
 *
 * Mark every open report on a comment as resolved (the admin has reviewed it).
 * Admin only. Editing/deleting the comment itself reuses the regular
 * /api/comments/:id endpoints, which already grant admins full access.
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))
    const result = await resolveCommentFlags(id)
    return { success: true, ...result }
  }
  catch (error) {
    return toH3Error(error)
  }
})
