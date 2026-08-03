import { articleService } from '~~/server/services/article.service'
import { destroyFromCloudinary } from '~~/server/utils/cloudinary'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { deleteCloudinaryMediaSchema } from '~~/server/validators/media.validator'

/** Delete only unattached Cloudinary media, such as an abandoned editor upload. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const media = deleteCloudinaryMediaSchema.parse(await readBody(event))
  await articleService.assertMediaCanBeDeleted(media.publicId)
  await destroyFromCloudinary({ publicId: media.publicId, type: media.resourceType })
  return success({ deleted: true })
})
