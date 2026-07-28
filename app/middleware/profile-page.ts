/**
 * app/middleware/profile-page.ts
 * Page guard for the signed-in user profile page.
 *
 * Runs before the page renders so it never flashes a blank frame:
 * - Guests -> login (with a redirect back).
 * - An unfinished OAuth account (profileCompleted === false) -> the persistent
 *   completion form. Such an account has no real username/password yet and the
 *   profile API would 409 for it, so we send it to /register/complete instead.
 * - A complete user falls through and sees the page.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: to.fullPath },
      replace: true,
    })
  }

  if (user.value?.profileCompleted === false) {
    return navigateTo(localePath('/register/complete'), { replace: true })
  }
})
