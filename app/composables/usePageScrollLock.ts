/**
 * Locks page scrolling while a flag is true.
 *
 * Vuetify's temporary <v-navigation-drawer> darkens the page but does NOT stop
 * it from scrolling, so scrolling inside the open drawer (or over the scrim)
 * moves the page behind it. This composable freezes the page for as long as the
 * drawer is open and restores it on close.
 *
 * Usage, next to the drawer's own state:
 *   const drawer = ref(false)
 *   usePageScrollLock(drawer)
 *
 * The lock is applied to <html> (not <body>) because that is the scrolling
 * element here, and VueUse restores the previous overflow value itself, so no
 * cleanup is needed. It also handles iOS Safari, which ignores `overflow:
 * hidden` on its own.
 */
export function usePageScrollLock(isLocked: Ref<boolean>): void {
  // Resolved after mount only: `document` does not exist while rendering on
  // the server.
  const scrollElement = ref<HTMLElement | null>(null)

  const lock = useScrollLock(scrollElement)

  onMounted(() => {
    scrollElement.value = document.documentElement
    // Sync immediately, in case the flag is already true on mount.
    lock.value = isLocked.value
  })

  watch(isLocked, (value) => {
    lock.value = value
  })

  // Never leave the page frozen if the component disappears while open
  // (e.g. a route change that swaps the whole navbar).
  onBeforeUnmount(() => {
    lock.value = false
  })
}
