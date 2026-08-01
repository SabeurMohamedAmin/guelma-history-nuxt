import type { ArticleResponse, PaginatedResponse, CreateArticleDto, UpdateArticleDto } from '~~/server/types/article.types'

/**
 * Client composable for the admin articles CRUD.
 *
 * Single responsibility: wrap $fetch calls with shared loading/error state.
 * Pages/components own their own form state and call these actions.
 */
export function useAdminArticles() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    }
    catch (err) {
      error.value = extractErrorMessage(err, 'An unexpected error occurred.')
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /** List EVERY article (the "All articles" window). */
  function fetchArticles(params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    status?: 'published' | 'draft' | 'all'
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    return run(() =>
      $fetch<PaginatedResponse<ArticleResponse>>('/api/admin/articles', { query: params }),
    )
  }

  /** List ONLY the acting admin's own created articles (the "My articles" window). */
  function fetchMyArticles(params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    status?: 'published' | 'draft' | 'all'
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    return run(() =>
      $fetch<PaginatedResponse<ArticleResponse>>('/api/admin/articles/mine', { query: params }),
    )
  }

  function fetchArticle(slug: string) {
    return run(() => $fetch<ArticleResponse>(`/api/admin/articles/${slug}`))
  }

  function createArticle(data: CreateArticleDto) {
    return run(() =>
      $fetch<ArticleResponse>('/api/admin/articles', { method: 'POST', body: data }),
    )
  }

  function updateArticle(slug: string, data: UpdateArticleDto) {
    return run(() =>
      $fetch<ArticleResponse>(`/api/admin/articles/${slug}`, { method: 'PATCH', body: data }),
    )
  }

  function deleteArticle(slug: string) {
    return run(() =>
      $fetch<null>(`/api/admin/articles/${slug}`, { method: 'DELETE' }),
    )
  }

  function setHomePosition(slug: string, position: number | null) {
    return run(() => $fetch<{ homePosition: number | null }>(`/api/admin/articles/${slug}/home-position`, {
      method: 'PATCH',
      body: { position },
    }))
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchArticles,
    fetchMyArticles,
    fetchArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    setHomePosition,
  }
}
