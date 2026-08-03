import { categoryRepository } from '~~/server/repositories/category.repository'
import {
  createCategorySchema,
  updateCategorySchema,
} from '~~/server/validators/category.validator'

export class CategoryService {
  findAll() {
    return categoryRepository.findAll()
  }

  count() {
    return categoryRepository.count()
  }

  async create(input: unknown) {
    const data = createCategorySchema.parse(input)
    await this.validateParent(undefined, data.parentId)

    const created = await categoryRepository.create(data)
    if (!created) throw createError({ statusCode: 500, message: 'Category could not be created' })

    return created
  }

  async update(id: string, input: unknown) {
    const data = updateCategorySchema.parse(input)
    await this.validateParent(id, data.parentId)

    const updated = await categoryRepository.update(id, data)
    if (!updated) throw createError({ statusCode: 404, message: 'Category not found' })

    return updated
  }

  async delete(id: string): Promise<void> {
    const { childCount, articleCount } = await categoryRepository.countReferences(id)

    if (childCount > 0 || articleCount > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: `Cannot delete this category while it has ${childCount} child category(s) and ${articleCount} article(s).`,
      })
    }

    if (!await categoryRepository.delete(id)) {
      throw createError({ statusCode: 404, message: 'Category not found' })
    }
  }

  private async validateParent(categoryId: string | undefined, parentId: string | null | undefined): Promise<void> {
    if (!parentId) return

    const visited = new Set<string>()
    let currentId: string | null = parentId

    while (currentId) {
      if (currentId === categoryId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'The selected parent would create a category hierarchy cycle.',
        })
      }

      if (visited.has(currentId)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Conflict',
          message: 'The existing category hierarchy contains a cycle.',
        })
      }
      visited.add(currentId)

      const parent = await categoryRepository.findParentId(currentId)
      if (!parent) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          message: 'parentId contains an unknown UUID.',
        })
      }

      currentId = parent.parentId
    }
  }
}

export const categoryService = new CategoryService()
