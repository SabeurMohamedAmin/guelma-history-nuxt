/**
 * Guard for guest-only author auth pages.
 *
 * Any logged-in visitor is redirected away from the author login page, by role:
 * - authors go to the author area,
 * - admins go to their own area (one session per browser, role-based),
 * - a regular user is sent to complete their profile if unfinished,
 *   otherwise back to the public home page.
 */
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value) return

  if (user.value?.role === 'author') {
    return navigateTo(localePath('/author'), { replace: true })
  }
  if (user.value?.role === 'admin') {
    return navigateTo(localePath('/admin'), { replace: true })
  }
  if (user.value?.profileCompleted === false) {
    return navigateTo(localePath('/register/complete'), { replace: true })
  }
  return navigateTo(localePath('/'), { replace: true })
})
