import { requireCompleteUser, refreshUserSession } from '~~/server/utils/auth'
import { processAvatarImage } from '~~/server/utils/avatarImage'
import { updateUserAvatar } from '~~/server/utils/userProfile'

/**
 * POST /api/auth/user/profile/avatar
 * Accepts a multipart image upload of any common format/size, normalizes it
 * with sharp (square WebP) and stores the resulting bytes in the user row.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireCompleteUser(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'avatar' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No avatar file provided.' })
  }

  const image = await processAvatarImage(filePart.data)

  const profile = await updateUserAvatar(id, image.data, image.mimeType)
  await refreshUserSession(event, id)

  return profile
})
