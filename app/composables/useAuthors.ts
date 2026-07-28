import type { Author } from '~~/shared/types/author'

/** Author row as returned by the admin list/detail endpoints (with article counts). */
export interface AdminAuthor extends Author {
  articleCount: number
  publishedCount: number
}

export interface CreateAuthorDto {
  nameAr: string
  nameFr: string
  bioAr?: string | null
  bioFr?: string | null
  avatar?: string | null
}

export type UpdateAuthorDto = Partial<CreateAuthorDto>

/**
 * Client composable for the admin authors CRUD.
 *
 * Single responsibility: wrap $fetch calls with shared loading/error state.
 * Authors are addressed by slug (mirrors how articles/categories are routed).
 */
export function useAuthors() {
  const authors = ref<AdminAuthor[]>([])
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
    const data = await run(() => $fetch<AdminAuthor[]>('/api/admin/authors/list'))
    authors.value = data
    return data
  }

  /** Fetch a single author by slug, for the edit page. */
  function fetchOne(slug: string) {
    return run(() => $fetch<AdminAuthor>(`/api/admin/authors/by-slug/${encodeURIComponent(slug)}`))
  }

  function createAuthor(payload: CreateAuthorDto) {
    return run(() => $fetch<Author>('/api/admin/authors', { method: 'POST', body: payload }))
  }

  function updateAuthor(slug: string, payload: UpdateAuthorDto) {
    return run(() => $fetch<Author>(`/api/admin/authors/by-slug/${encodeURIComponent(slug)}`, { method: 'PATCH', body: payload }))
  }

  function deleteAuthor(slug: string) {
    return run(() => $fetch<null>(`/api/admin/authors/by-slug/${encodeURIComponent(slug)}`, { method: 'DELETE' }))
  }

  return {
    authors: readonly(authors),
    pending: readonly(pending),
    error: readonly(error),
    fetchAll,
    fetchOne,
    createAuthor,
    updateAuthor,
    deleteAuthor,
  }
}
