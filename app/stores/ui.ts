export const useUiStore = defineStore('ui', () => {
  const searchOpen = ref(false)
  const activeTheme = ref('light')

  function openSearch() {
    searchOpen.value = true
  }

  function closeSearch() {
    searchOpen.value = false
  }

  function toggleSearch() {
    searchOpen.value = !searchOpen.value
  }

  return { searchOpen, activeTheme, openSearch, closeSearch, toggleSearch }
})
