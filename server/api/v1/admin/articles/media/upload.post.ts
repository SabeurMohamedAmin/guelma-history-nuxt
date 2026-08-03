import { articleMediaUploadService } from '~~/server/services/article-media-upload.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** One multipart request supports native Flutter upload progress reporting. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No file provided.' })
  return success(await articleMediaUploadService.upload(file.data, file.type))
})
