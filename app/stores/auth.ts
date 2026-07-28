/**
 * Thin Pinia wrapper around the nuxt-auth-utils session.
 *
 * Components can use either `useUserSession()` directly or this store; the
 * store exists for places that prefer a single typed access point and is
 * ready to hold extra client-side auth state as the app grows.
 */
export const useAuthStore = defineStore('auth', () => {
  const { user, loggedIn, clear, fetch } = useUserSession()

  const isAdmin = computed(() => user.value?.role === 'admin')

  return { user, loggedIn, isAdmin, clear, refresh: fetch }
})
