/**
 * Guard for the OAuth complete-profile page.
 *
 * Only reachable by a logged-in user whose profile is still incomplete:
 * - guests are sent to login (they have nothing to complete),
 * - users who already finished are sent home (the step is done),
 * - an incomplete user falls through and sees the form.
 */
export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  const localePath = useLocalePath()
  if (!loggedIn.value) {
    return navigateTo(localePath('/login'), { replace: true })
  }
  if (user.value?.profileCompleted) {
    return navigateTo(localePath('/'), { replace: true })
  }
})
