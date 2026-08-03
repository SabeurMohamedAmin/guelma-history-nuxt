import { authorService } from '~~/server/services/author.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug) throw createError({ statusCode: 400, message: 'Invalid author slug' })
  await authorService.deleteBySlug(slug)
  return null
})
