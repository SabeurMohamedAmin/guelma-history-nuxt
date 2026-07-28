import type { Category } from '~~/shared/types/category'

type CreateCategoryDto = {
  nameAr: string
  nameFr: string
  slug: string
  descriptionAr?: string | null
  descriptionFr?: string | null
  icon?: string | null
  coverImage?: string | null
  parentId?: number | null
}

type UpdateCategoryDto = Partial<CreateCategoryDto>

export function useCategories() {
  const categories = ref<Category[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    pending.value = true
    error.value = null
    try {
      return await fn()
    }
    catch (err: unknown) {
      error.value = extractErrorMessage(err, 'Unexpected error')
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function fetchAll() {
    const data = await run(() => $fetch<Category[]>('/api/admin/categories'))
    categories.value = data
    return data
  }

  function createCategory(payload: CreateCategoryDto) {
    return run(() => $fetch<Category>('/api/admin/categories', { method: 'POST', body: payload }))
  }

  function updateCategory(id: number, payload: UpdateCategoryDto) {
    return run(() => $fetch<Category>(`/api/admin/categories/${id}`, { method: 'PATCH', body: payload }))
  }

  function deleteCategory(id: number) {
    return run(() => $fetch<null>(`/api/admin/categories/${id}`, { method: 'DELETE' }))
  }

  return {
    categories: readonly(categories),
    pending: readonly(pending),
    error: readonly(error),
    fetchAll,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
