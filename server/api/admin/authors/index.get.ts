import { authorService } from '~~/server/services/author.service'

/** GET /api/admin/authors — lightweight form options. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return authorService.findOptions()
})
