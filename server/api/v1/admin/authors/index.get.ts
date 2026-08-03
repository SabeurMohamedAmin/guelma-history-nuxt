import { authorService } from '~~/server/services/author.service'
import { serializeMobileAuthor } from '~~/server/serializers/author.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { paginated, normalizePagination } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const query = getQuery(event)
  const pagination = normalizePagination({ page: Number(query.page), pageSize: Number(query.pageSize) })
  const search = String(query.search ?? '').trim().toLocaleLowerCase()
  const authors = await authorService.findAll()
  const filtered = search
    ? authors.filter(author => [author.nameAr, author.nameFr, author.slug]
        .some(value => value.toLocaleLowerCase().includes(search)))
    : authors
  const page = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize)
  return paginated(page.map(serializeMobileAuthor), pagination, filtered.length)
})
