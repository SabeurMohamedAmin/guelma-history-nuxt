// app/composables/useHomeData.ts
//
// Fetches all home-page data in a single round-trip. Mirrors the structure of
// useCategoryArticles so the page component stays thin and declarative.

import type { ArticleListItem } from '~~/shared/types/article'

// The categories returned by /api/home include an articleCount aggregate, so we
// extend the lightweight shape the filter component needs.
interface HomeCategory {
  id: string
  nameAr: string
  nameFr: string
  slug: string
  descriptionAr: string | null
  descriptionFr: string | null
  icon: string | null
  coverImage: string | null
  parentId: string | null
  articleCount: number
}

interface HomeResponse {
  featured: ArticleListItem[]
  articles: ArticleListItem[]
  categories: HomeCategory[]
}

export function useHomeData() {
  const { data, pending, error, refresh } = useFetch<HomeResponse>('/api/home', {
    default: (): HomeResponse => ({
      featured: [],
      articles: [],
      categories: [],
    }),
  })

  const heroArticles = computed<ArticleListItem[]>(() => data.value?.featured ?? [])
  const articles = computed<ArticleListItem[]>(() => data.value?.articles ?? [])
  const categories = computed<HomeCategory[]>(() => data.value?.categories ?? [])
  const recentArticles = computed<ArticleListItem[]>(() => articles.value.slice(0, 5))
  const hasArticles = computed(() => articles.value.length > 0)

  return {
    heroArticles,
    articles,
    categories,
    recentArticles,
    hasArticles,
    pending,
    error,
    refresh,
  }
}
