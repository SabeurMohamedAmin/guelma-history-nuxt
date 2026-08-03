import { authorService } from '~~/server/services/author.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug) throw createError({ statusCode: 400, message: 'Invalid author slug' })
  return authorService.updateBySlug(slug, await readBody(event))
})
