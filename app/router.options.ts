import type { RouterConfig } from '@nuxt/schema'

/**
 * Custom router scroll behavior.
 *
 * By default Nuxt scrolls to the top (or a saved position) on every route
 * change. That includes query-only changes on the SAME page — e.g. the comment
 * focus/re-root view (`?comment=<uuid>`), and the sort/order toggles — which
 * made "Continuer ce fil" jump the page around.
 *
 * Rule: if only the query changed (same path), keep the current scroll
 * position. Otherwise fall back to the default behavior (saved position on
 * back/forward, hash anchor, or top of page).
 */
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // Same page, only the query string changed: don't move the viewport.
    if (to.path === from.path) return false

    // Back/forward: restore where the user was.
    if (savedPosition) return savedPosition

    // Anchor link: scroll to the element.
    if (to.hash) return { el: to.hash, behavior: 'smooth' }

    // New page: start at the top.
    return { top: 0 }
  },
}
