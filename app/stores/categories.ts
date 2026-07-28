export const useCategoriesStore = defineStore('categories', () => {
  const tree = ref<CategoryTree[]>([])
  const loading = ref(false)

  return { tree, loading }
})
