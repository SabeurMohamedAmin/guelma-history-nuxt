import { authorRepository } from '~~/server/repositories/author.repository'
import { slugify } from '~~/server/utils/slugify'
import {
  createAdminAuthorSchema,
  updateAdminAuthorSchema,
} from '~~/server/validators/author.validator'

export class AuthorService {
  count() { return authorRepository.count() }
  findOptions() { return authorRepository.findOptions() }
  findAll() { return authorRepository.findAllWithCounts() }

  async findBySlug(slug: string) {
    const author = await authorRepository.findBySlugWithCounts(slug)
    if (!author) throw createError({ statusCode: 404, message: 'Author not found' })
    return author
  }

  async create(input: unknown) {
    const data = createAdminAuthorSchema.parse(input)
    const slug = await this.generateUniqueSlug(data.nameFr)
    const author = await authorRepository.create(data, slug)
    if (!author) throw createError({ statusCode: 500, message: 'Author could not be created' })
    return author
  }

  async updateById(id: string, input: unknown) {
    const data = updateAdminAuthorSchema.parse(input)
    const updated = await authorRepository.update(id, data)
    if (!updated) throw createError({ statusCode: 404, message: 'Author not found' })
    return updated
  }

  async updateBySlug(slug: string, input: unknown) {
    const current = await authorRepository.findIdentityBySlug(slug)
    if (!current) throw createError({ statusCode: 404, message: 'Author not found' })

    const data = updateAdminAuthorSchema.parse(input)
    const nextSlug = data.nameFr && data.nameFr !== current.nameFr
      ? await this.generateUniqueSlug(data.nameFr, current.id)
      : undefined

    const updated = await authorRepository.update(current.id, {
      ...data,
      ...(nextSlug ? { slug: nextSlug } : {}),
    })
    if (!updated) throw createError({ statusCode: 404, message: 'Author not found' })
    return updated
  }

  async deleteById(id: string): Promise<void> {
    await this.assertCanDelete(id)
    if (!await authorRepository.delete(id)) {
      throw createError({ statusCode: 404, message: 'Author not found' })
    }
  }

  async deleteBySlug(slug: string): Promise<void> {
    const author = await authorRepository.findIdentityBySlug(slug)
    if (!author) throw createError({ statusCode: 404, message: 'Author not found' })
    await this.deleteById(author.id)
  }

  private async assertCanDelete(id: string): Promise<void> {
    const total = await authorRepository.countArticles(id)
    if (total > 0) {
      throw createError({
        statusCode: 409,
        message: `Cannot delete an author with ${total} article(s). Reassign or remove them first.`,
      })
    }
  }

  private async generateUniqueSlug(nameFr: string, excludeId?: string): Promise<string> {
    const base = slugify(nameFr) || 'author'
    let candidate = base
    let suffix = 1

    while (await authorRepository.slugExists(candidate, excludeId)) {
      suffix += 1
      candidate = `${base}-${suffix}`
    }
    return candidate
  }
}

export const authorService = new AuthorService()
