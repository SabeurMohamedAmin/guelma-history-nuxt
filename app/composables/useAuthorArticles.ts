import type { ArticleResponse, PaginatedResponse, CreateArticleDto, UpdateArticleDto } from '~~/server/types/article.types'

/**
 * Client composable for the author articles CRUD.
 *
 * Mirror of useAdminArticles, but talks to the author-scoped API tree
 * (`/api/author/articles`). The server enforces ownership: an author only ever
 * sees/edits/deletes their own articles, an admin (inheriting author) any.
 *
 * Single responsibility: wrap $fetch calls with shared loading/error state.
 * Pages/components own their own form state and call these actions.
 */
export function useAuthorArticles() {
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

  /** List ONLY the acting author's own articles (their "My articles" view). */
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
      $fetch<PaginatedResponse<ArticleResponse>>('/api/author/articles', { query: params }),
    )
  }

  /**
   * List EVERY published article for the read-only "All articles" view.
   * The server forces status=published, so any status passed here is ignored.
   */
  function fetchAllArticles(params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    return run(() =>
      $fetch<PaginatedResponse<ArticleResponse>>('/api/author/articles/all', { query: params }),
    )
  }

  function fetchArticle(slug: string) {
    return run(() => $fetch<ArticleResponse>(`/api/author/articles/${slug}`))
  }

  function createArticle(data: CreateArticleDto) {
    return run(() =>
      $fetch<ArticleResponse>('/api/author/articles', { method: 'POST', body: data }),
    )
  }

  function updateArticle(slug: string, data: UpdateArticleDto) {
    return run(() =>
      $fetch<ArticleResponse>(`/api/author/articles/${slug}`, { method: 'PATCH', body: data }),
    )
  }

  function deleteArticle(slug: string) {
    return run(() =>
      $fetch<null>(`/api/author/articles/${slug}`, { method: 'DELETE' }),
    )
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchArticles,
    fetchAllArticles,
    fetchArticle,
    createArticle,
    updateArticle,
    deleteArticle,
  }
}
