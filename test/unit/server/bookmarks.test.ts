import { describe, it, expect } from 'vitest'
import { nextBookmarkState, applyBookmarkToggle } from '~~/shared/bookmarks'

/**
 * The bookmark toggle is the heart of the optimistic UX and the idempotency
 * guarantee. These tests pin down the pure decision (no DB, no store) so the
 * client and server can rely on the same rule.
 */

describe('nextBookmarkState', () => {
  it('saves an unsaved article with POST', () => {
    expect(nextBookmarkState(false)).toEqual({ nextSaved: true, method: 'POST' })
  })

  it('unsaves a saved article with DELETE', () => {
    expect(nextBookmarkState(true)).toEqual({ nextSaved: false, method: 'DELETE' })
  })

  it('is its own inverse (toggling twice returns to the start)', () => {
    const first = nextBookmarkState(false)
    const second = nextBookmarkState(first.nextSaved)
    expect(second.nextSaved).toBe(false)
  })
})

describe('applyBookmarkToggle', () => {
  const articleA = '10000000-0000-4000-8000-000000000001'
  const articleB = '10000000-0000-4000-8000-000000000002'
  const articleC = '10000000-0000-4000-8000-000000000003'
  const missingArticle = '10000000-0000-4000-8000-000000000099'

  it('adds an id when saving', () => {
    const result = applyBookmarkToggle(new Set<string>(), articleA, true)
    expect([...result]).toEqual([articleA])
  })

  it('removes an id when unsaving', () => {
    const result = applyBookmarkToggle(new Set([articleA]), articleA, false)
    expect(result.has(articleA)).toBe(false)
  })

  it('saving the same article twice is a no-op (idempotent)', () => {
    const once = applyBookmarkToggle(new Set([articleA]), articleA, true)
    const twice = applyBookmarkToggle(once, articleA, true)
    expect([...twice]).toEqual([articleA])
  })

  it('removing an absent article is a no-op (idempotent)', () => {
    const result = applyBookmarkToggle(new Set([articleA, articleB]), missingArticle, false)
    expect([...result]).toEqual([articleA, articleB])
  })

  it('returns a new set without mutating the input (reactivity-safe)', () => {
    const input = new Set([articleA])
    const result = applyBookmarkToggle(input, articleB, true)
    expect(result).not.toBe(input)
    expect([...input]).toEqual([articleA])
    expect([...result]).toEqual([articleA, articleB])
  })

  it('does not disturb other saved ids', () => {
    const result = applyBookmarkToggle(
      new Set([articleA, articleB, articleC]),
      articleB,
      false,
    )
    expect([...result].sort()).toEqual([articleA, articleC])
  })
})
