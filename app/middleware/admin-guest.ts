/**
 * Guard for guest-only admin auth pages.
 *
 * Any logged-in visitor is redirected away from the admin login page, by role:
 * - admins go to the admin area,
 * - authors go to the author area,
 * - a regular user is sent to complete their profile if unfinished,
 *   otherwise back to the public home page.
 */
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value) return

  if (user.value?.role === 'admin') {
    return navigateTo(localePath('/admin'), { replace: true })
  }
  if (user.value?.role === 'author') {
    return navigateTo(localePath('/author'), { replace: true })
  }
  if (user.value?.profileCompleted === false) {
    return navigateTo(localePath('/register/complete'), { replace: true })
  }
  return navigateTo(localePath('/'), { replace: true })
})
