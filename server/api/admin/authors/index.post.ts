import { authorService } from '~~/server/services/author.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return authorService.create(await readBody(event))
})
