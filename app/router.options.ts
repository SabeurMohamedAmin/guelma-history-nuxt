import type { RouterConfig } from '@nuxt/schema'

interface ScrollPosition {
  left: number
  top: number
}

/**
 * Must match the key used in LocaleSwitcher.vue.
 */
const LOCALE_SCROLL_KEY = 'locale-switch-scroll-position'

/**
 * Controls the window scroll position after each client-side navigation.
 */
export default <RouterConfig>{
  scrollBehavior(_to, _from, savedPosition) {
    /**
     * Browser Back and Forward:
     * Vue Router provides the exact saved browser history position.
     */
    if (savedPosition) {
      return savedPosition
    }

    /**
     * Language switch:
     * LocaleSwitcher.vue stores the current scroll coordinates immediately
     * before Nuxt i18n changes the localized route.
     */
    if (import.meta.client) {
      const savedPositionJson = sessionStorage.getItem(LOCALE_SCROLL_KEY)

      if (savedPositionJson) {
        sessionStorage.removeItem(LOCALE_SCROLL_KEY)

        try {
          const position = JSON.parse(savedPositionJson) as ScrollPosition

          return {
            left: position.left,
            top: position.top,
            behavior: 'instant',
          }
        }
        catch {
          // Invalid session storage should not break routing.
        }
      }
    }

    /**
     * Standard navigation:
     * New pages always start at the top.
     */
    return {
      left: 0,
      top: 0,
    }
  },
}
