import { requireAdmin } from '~~/server/utils/auth'

/**
 * Legacy upload placeholder.
 *
 * Article media uses /api/admin/articles/media/upload. Keep this route explicit
 * and protected until it is either implemented for a distinct purpose or
 * removed after confirming that no client depends on it.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  throw createError({
    statusCode: 501,
    statusMessage: 'Not Implemented',
    message: 'Use /api/admin/articles/media/upload for article media.',
  })
})
