import { authorService } from '~~/server/services/author.service'
import { serializeMobileAuthor } from '~~/server/serializers/author.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const author = await authorService.create(await readBody(event))
  setResponseStatus(event, 201)
  return success(serializeMobileAuthor(author))
})
