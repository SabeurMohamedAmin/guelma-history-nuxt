/**
 * app/middleware/admin.ts
 * Named route guard for admin pages.
 *
 * Keep this simple and explicit: admin pages opt in with
 * `middleware: ['admin']`, and unauthenticated users go to login.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value || user.value?.role !== 'admin') {
    return navigateTo({
      path: localePath('/admin/login'),
      query: { redirect: to.fullPath },
      replace: true,
    })
  }
})
