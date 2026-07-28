/**
 * Pure, framework-free bookmark logic shared by the client store and tests.
 *
 * Keeping the toggle decision here (no Pinia, no `$fetch`, no DB) means the rule
 * — "what should happen when the user taps save?" — can be unit-tested in the
 * plain node test project, exactly like `shared/auth/roles.ts`.
 */

/** The HTTP method used to reach a desired saved state. */
export type BookmarkMethod = 'POST' | 'DELETE'

export interface BookmarkTransition {
  /** The saved flag after an optimistic toggle from `wasSaved`. */
  nextSaved: boolean
  /** POST to save, DELETE to unsave. */
  method: BookmarkMethod
}

/**
 * Decide the result of tapping the save control given the current state.
 *
 * Saved -> unsaved (DELETE); unsaved -> saved (POST). The toggle is its own
 * inverse, so applying it twice returns to the original state.
 */
export function nextBookmarkState(wasSaved: boolean): BookmarkTransition {
  return wasSaved
    ? { nextSaved: false, method: 'DELETE' }
    : { nextSaved: true, method: 'POST' }
}

/**
 * Return a new set with `articleId` added or removed to match `saved`.
 *
 * Idempotent by construction: adding an id already present, or removing one
 * that's absent, yields an equivalent set — this is what guarantees "saving the
 * same article twice is a no-op" on the client, mirroring the DB unique index.
 * A new Set is returned (never mutated in place) so Vue reactivity tracks it.
 *
 * Generic over the id type: real article ids are int64 DIGIT STRINGS (they
 * exceed Number.MAX_SAFE_INTEGER), but the rule itself is id-shape agnostic.
 */
export function applyBookmarkToggle<Id extends string | number>(
  current: ReadonlySet<Id>,
  articleId: Id,
  saved: boolean,
): Set<Id> {
  const next = new Set(current)
  if (saved) next.add(articleId)
  else next.delete(articleId)
  return next
}
