/**
 * Guard for guest-only public auth pages (login, register, verify-email).
 *
 * A logged-in visitor has no business on these pages, so send them where they
 * belong by role:
 * - admins/authors go to their own areas,
 * - a regular user with an unfinished OAuth profile is sent to the
 *   complete-profile page (they must finish before using the site),
 * - a regular user with a completed profile goes to their profile.
 *
 * Guests fall through and see the page.
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
  return navigateTo(localePath('/profile'), { replace: true })
})
