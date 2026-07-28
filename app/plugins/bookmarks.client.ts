/**
 * Hydrate the current user's bookmarked article ids once on app load.
 *
 * Runs client-side only: bookmarks are personal and auth-gated, so there is
 * nothing to fetch for guests or during SSR. When a session exists we load the
 * id set so every save button renders the correct state immediately. On logout
 * the store is reset so a guest never sees stale saved state.
 */
export default defineNuxtPlugin(() => {
  const { loggedIn } = useUserSession()
  const bookmarks = useBookmarksStore()

  watch(
    loggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) {
        bookmarks.hydrate()
      }
      else {
        bookmarks.reset()
      }
    },
    { immediate: true },
  )
})
