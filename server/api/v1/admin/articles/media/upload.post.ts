import { createHash } from 'node:crypto'
import { articleMediaUploadService } from '~~/server/services/article-media-upload.service'
import { mobileUploadIdempotencyRepository } from '~~/server/repositories/mobile-upload-idempotency.repository'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** One multipart request supports native Flutter upload progress reporting. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const key = getHeader(event, 'idempotency-key')?.trim()
  if (!key || !/^[A-Za-z0-9._-]{16,100}$/.test(key)) {
    throw createError({ statusCode: 400, message: 'A valid Idempotency-Key header is required.' })
  }

  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'file' && part.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No file provided.' })
  const requestHash = createHash('sha256').update(file.data).digest('hex')
  await mobileUploadIdempotencyRepository.cleanup()

  const existing = await mobileUploadIdempotencyRepository.find(principal.user.id, key)
  if (existing) {
    if (existing.requestHash !== requestHash) throw createError({ statusCode: 409, message: 'Idempotency key was already used for another file.' })
    if (!existing.responseJson) throw createError({ statusCode: 409, message: 'Upload with this idempotency key is still processing.' })
    return success(JSON.parse(existing.responseJson))
  }

  if (!await mobileUploadIdempotencyRepository.claim(principal.user.id, key, requestHash)) {
    throw createError({ statusCode: 409, message: 'Upload with this idempotency key is already processing.' })
  }

  try {
    const uploaded = await articleMediaUploadService.upload(file.data, file.type)
    await mobileUploadIdempotencyRepository.complete(principal.user.id, key, uploaded)
    return success(uploaded)
  }
  catch (error) {
    await mobileUploadIdempotencyRepository.remove(principal.user.id, key)
    throw error
  }
})
