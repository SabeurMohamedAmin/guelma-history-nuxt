/**
 * Search state + submit behavior.
 * Keeps the query in one place and navigates to the search results page.
 */
export function useSearch() {
  const localePath = useLocalePath()
  const router = useRouter()

  const query = ref('')

  const canSubmit = computed(() => query.value.trim().length > 0)

  async function submit() {
    if (!canSubmit.value) return

    await router.push({
      path: localePath('/search'),
      query: { q: query.value.trim() },
    })
  }

  function reset() {
    query.value = ''
  }

  return { query, canSubmit, submit, reset }
}
