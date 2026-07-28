export const useArticlesStore = defineStore('articles', () => {
  const items = ref<ArticleListItem[]>([])
  const loading = ref(false)
  const filters = ref<ArticleFilters>({})

  return { items, loading, filters }
})
