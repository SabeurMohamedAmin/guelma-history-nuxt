/**
 * app/middleware/user-only.ts
 * Named route guard for signed-in user pages (e.g. the profile page).
 *
 * Pages opt in with `middleware: ['user-only']`. Any logged-in visitor is
 * allowed through; guests are sent to the login page with a redirect back to
 * where they were heading.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value) {
    return navigateTo({
      path: localePath('/login'),
      query: { redirect: to.fullPath },
      replace: true,
    })
  }
})
