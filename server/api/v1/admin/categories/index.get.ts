import { categoryService } from '~~/server/services/category.service'
import { serializeMobileCategory } from '~~/server/serializers/category.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** List categories with optional bilingual text search. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const search = String(getQuery(event).search ?? '').trim().toLocaleLowerCase()
  const categories = await categoryService.findAll()
  const filtered = search
    ? categories.filter(category => [category.nameAr, category.nameFr, category.slug]
        .some(value => value.toLocaleLowerCase().includes(search)))
    : categories

  return success(filtered.map(serializeMobileCategory))
})
