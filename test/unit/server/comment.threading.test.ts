import { describe, it, expect } from 'vitest'
import { buildCommentPath, parseAncestorIds } from '~~/server/utils/comments'

/**
 * Pure threading math: how a comment's materialized path and its ancestor list
 * are derived. These are the rules that let the whole feature read a subtree
 * with a single `path LIKE 'id/%'` query, so they are worth pinning down
 * independently of the database.
 *
 * Comment ids are uuid STRINGS in production. Short strings ('a', 'b', ...)
 * are used here for readability; the helpers only rely on ids never
 * containing '/', which holds for uuids.
 */

describe('buildCommentPath', () => {
  it('uses just the id for a root comment (no parent path)', () => {
    expect(buildCommentPath('', 'a')).toBe('a')
  })

  it('appends the id to a parent path for a reply', () => {
    expect(buildCommentPath('a', 'b')).toBe('a/b')
  })

  it('keeps appending for deeper nesting', () => {
    expect(buildCommentPath('a/b', 'c')).toBe('a/b/c')
    expect(buildCommentPath('a/b/c', 'd')).toBe('a/b/c/d')
  })
})

describe('parseAncestorIds', () => {
  it('returns an empty list for a root comment', () => {
    expect(parseAncestorIds('a', 'a')).toEqual([])
  })

  it('returns ancestors root-first, excluding the comment itself', () => {
    expect(parseAncestorIds('a/b/c', 'c')).toEqual(['a', 'b'])
  })

  it('handles a single-parent reply', () => {
    expect(parseAncestorIds('a/b', 'b')).toEqual(['a'])
  })

  it('round-trips with buildCommentPath', () => {
    const path = buildCommentPath(buildCommentPath('a', 'b'), 'c')
    expect(path).toBe('a/b/c')
    expect(parseAncestorIds(path, 'c')).toEqual(['a', 'b'])
  })

  it('drops empty path segments defensively', () => {
    expect(parseAncestorIds('a//c', 'c')).toEqual(['a'])
  })
})
