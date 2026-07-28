/**
 * Owns the current user's reading list (bookmarks).
 *
 * Responsibilities:
 * - keep the set of bookmarked article SLUGS so every save button knows its state,
 * - expose an optimistic `toggle` that flips immediately and rolls back on error
 *   (mirrors the comment vote UX),
 * - load the full saved-articles list for the Reading List page.
 *
 * Articles are referenced by their public slug everywhere (stable, readable,
 * and already present on every card/page); the internal database id never
 * reaches the client APIs.
 *
 * The user id is never sent from the client; the API resolves it from the
 * session and returns 401 for guests. This store is only meaningful when
 * logged in; `reset()` clears it on logout.
 */

/** A reading-list entry as returned by GET /api/bookmarks. */
import { applyBookmarkToggle, nextBookmarkState } from '~~/shared/bookmarks'

export interface BookmarkItem {
  id: string
  slug: string
  titleAr: string
  titleFr: string
  coverImage: string | null
  readingTime: number
  publishedAt: string | null
  savedAt: string
}

interface ListResponse {
  success: boolean
  data: {
    items: BookmarkItem[]
    slugs: string[]
  }
}

interface ToggleResponse {
  success: boolean
  data: { bookmarked: boolean }
}

export const useBookmarksStore = defineStore('bookmarks', () => {
  // Set of article slugs the user has saved. A Set gives O(1) `isBookmarked`.
  const savedSlugs = ref<Set<string>>(new Set())
  // Full saved-articles list for the Reading List page.
  const items = ref<BookmarkItem[]>([])
  // True once the initial hydration request has completed.
  const hydrated = ref(false)
  const pending = ref(false)

  const count = computed(() => savedSlugs.value.size)

  /** Whether a given article (by slug) is in the current user's reading list. */
  function isBookmarked(articleSlug: string): boolean {
    return savedSlugs.value.has(articleSlug)
  }

  /** Load the full reading list and the bookmarked slug set in one request. */
  async function load() {
    pending.value = true
    try {
      const res = await $fetch<ListResponse>('/api/bookmarks')
      items.value = res.data.items
      savedSlugs.value = new Set(res.data.slugs)
      hydrated.value = true
    }
    finally {
      pending.value = false
    }
  }

  /** Hydrate just the slug set once (cheap; for save buttons across the app). */
  async function hydrate() {
    if (hydrated.value) return
    try {
      await load()
    }
    catch {
      // A failed hydration must not break the page; buttons just show "unsaved".
      hydrated.value = true
    }
  }

  /**
   * Toggle an article's saved state optimistically. The slug set flips right
   * away for instant feedback, then reconciles with the server; on error it
   * rolls back to the previous state.
   */
  async function toggle(articleSlug: string): Promise<void> {
    const wasSaved = savedSlugs.value.has(articleSlug)
    const { nextSaved, method } = nextBookmarkState(wasSaved)

    // Optimistic flip.
    setSaved(articleSlug, nextSaved)

    try {
      const res = await $fetch<ToggleResponse>(`/api/articles/${articleSlug}/bookmark`, {
        method,
      })
      // Reconcile with the authoritative server state.
      setSaved(articleSlug, res.data.bookmarked)
      if (!res.data.bookmarked) {
        items.value = items.value.filter(item => item.slug !== articleSlug)
      }
    }
    catch (error) {
      // Roll back the optimistic change.
      setSaved(articleSlug, wasSaved)
      throw error
    }
  }

  /** Remove an item from the Reading List page (delegates to toggle). */
  async function remove(articleSlug: string): Promise<void> {
    if (!savedSlugs.value.has(articleSlug)) return
    await toggle(articleSlug)
  }

  /** Update the saved set immutably so reactivity tracks the change. */
  function setSaved(articleSlug: string, saved: boolean) {
    savedSlugs.value = applyBookmarkToggle(savedSlugs.value, articleSlug, saved)
  }

  /** Clear all state (on logout). */
  function reset() {
    savedSlugs.value = new Set()
    items.value = []
    hydrated.value = false
  }

  return {
    // state
    savedSlugs,
    items,
    hydrated,
    pending,
    count,
    // actions
    isBookmarked,
    load,
    hydrate,
    toggle,
    remove,
    reset,
  }
})
