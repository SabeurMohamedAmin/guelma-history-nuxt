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
  it('adds an id when saving', () => {
    const result = applyBookmarkToggle(new Set<string>(), 'article-7', true)
    expect([...result]).toEqual(['article-7'])
  })

  it('removes an id when unsaving', () => {
    const result = applyBookmarkToggle(new Set(['article-7']), 'article-7', false)
    expect(result.has('article-7')).toBe(false)
  })

  it('saving the same article twice is a no-op (idempotent)', () => {
    const once = applyBookmarkToggle(new Set(['article-7']), 'article-7', true)
    const twice = applyBookmarkToggle(once, 'article-7', true)
    expect([...twice]).toEqual(['article-7'])
  })

  it('removing an absent article is a no-op (idempotent)', () => {
    const result = applyBookmarkToggle(new Set(['article-1', 'article-2']), 'article-99', false)
    expect([...result]).toEqual(['article-1', 'article-2'])
  })

  it('returns a new set without mutating the input (reactivity-safe)', () => {
    const input = new Set(['article-1'])
    const result = applyBookmarkToggle(input, 'article-2', true)
    expect(result).not.toBe(input)
    expect([...input]).toEqual(['article-1'])
    expect([...result]).toEqual(['article-1', 'article-2'])
  })

  it('does not disturb other saved ids', () => {
    const result = applyBookmarkToggle(
      new Set(['article-1', 'article-2', 'article-3']),
      'article-2',
      false,
    )
    expect([...result].sort()).toEqual(['article-1', 'article-3'])
  })
})
