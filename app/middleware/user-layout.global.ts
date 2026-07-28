import type { RouteLocationNormalized } from 'vue-router'

/**
 * app/middleware/user-layout.global.ts
 *
 * Applies the `user` layout across the whole app when a regular user is logged
 * in, based on the session. This gives signed-in users their own navbar (with
 * the profile avatar) on every public page without having to set the layout on
 * each page individually.
 *
 * It only swaps pages that use the default public layout. Pages that opt into a
 * specific layout (admin, author, auth, article, …) are left untouched, so the
 * admin/author dashboards and the login/register screens keep their own shells.
 */

// The public layout we replace with the user layout when logged in. Pages with
// no explicit layout fall back to 'default' in Nuxt, so we treat that as the
// swap target too.
const PUBLIC_LAYOUTS = new Set(['default', undefined])

export default defineNuxtRouteMiddleware((to: RouteLocationNormalized) => {
  const { loggedIn, user } = useUserSession()

  // Only regular users get the user navbar. Admins and authors have their own
  // dashboards/layouts, and guests keep the default public layout.
  if (!loggedIn.value || user.value?.role !== 'user') return

  if (PUBLIC_LAYOUTS.has(to.meta.layout as string | undefined)) {
    to.meta.layout = 'user'
  }
})
