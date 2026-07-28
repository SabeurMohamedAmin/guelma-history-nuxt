import { requireAdmin } from '~~/server/utils/auth'
import { listFlaggedComments } from '~~/server/utils/comments'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/comments/flags
 *
 * The admin moderation queue: comments with open (unresolved) reports. Admin
 * only. Each entry carries the comment, its author, the report count and the
 * aggregated reasons so the admin can decide to edit, delete, or resolve.
 */
export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const data = await listFlaggedComments()
    return { success: true, data }
  }
  catch (error) {
    return toH3Error(error)
  }
})
