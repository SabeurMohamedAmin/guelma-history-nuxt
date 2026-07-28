import { requireAdmin, refreshUserSession } from '~~/server/utils/auth'
import { processAvatarImage } from '~~/server/utils/avatarImage'
import { updateAvatar } from '~~/server/utils/adminProfile'

/**
 * POST /api/admin/profile/avatar
 * Accepts a multipart image upload of any common format/size, normalizes it
 * with sharp (square WebP) and stores the resulting bytes in the admin row.
 * No filesystem state is required for profile avatars.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireAdmin(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'avatar' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No avatar file provided.' })
  }

  const image = await processAvatarImage(filePart.data)

  const profile = await updateAvatar(id, image.data, image.mimeType)
  await refreshUserSession(event, id)

  return profile
})
