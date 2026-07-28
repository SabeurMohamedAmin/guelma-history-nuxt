import { hasRole } from '~~/shared/auth/roles'

/**
 * app/middleware/author.ts
 * Named route guard for author pages.
 *
 * Author pages opt in with `middleware: ['author']`. Access requires at least
 * the author role, so admins (who inherit author) are allowed through too.
 * Everyone else is sent to the author login page.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()

  if (!loggedIn.value || !hasRole(user.value?.role, 'author')) {
    return navigateTo({
      path: localePath('/author/login'),
      query: { redirect: to.fullPath },
      replace: true,
    })
  }
})
