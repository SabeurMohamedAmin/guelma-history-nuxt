/**
 * app/middleware/user-only.ts
 * Named route guard for signed-in user pages (e.g. the profile page).
 *
 * Pages opt in with `middleware: ['user-only']`. Any logged-in visitor is
 * allowed through; guests are sent to the login page with a redirect back to
 * where they were heading.
 */
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value || user?.value?.profileCompleted === true || user?.value?.role !== 'user') {
    return navigateTo({
      path: localePath('/'),
      replace: true,
    })
  }
})
