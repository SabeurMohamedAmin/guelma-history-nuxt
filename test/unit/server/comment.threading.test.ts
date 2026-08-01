import { describe, it, expect } from 'vitest'
import { buildCommentPath, parseAncestorIds } from '~~/server/utils/comments'

/**
 * Pure threading math: how a comment's materialized path and its ancestor list
 * are derived. These are the rules that let the whole feature read a subtree
 * with a single `path LIKE 'id/%'` query, so they are worth pinning down
 * independently of the database.
 *
 * Fixtures use canonical UUID strings so tests exercise the production path
 * representation instead of teaching callers to use ad-hoc identifiers.
 */

const rootId = '20000000-0000-4000-8000-000000000001'
const childId = '20000000-0000-4000-8000-000000000002'
const grandchildId = '20000000-0000-4000-8000-000000000003'
const fourthId = '20000000-0000-4000-8000-000000000004'

describe('buildCommentPath', () => {
  it('uses just the id for a root comment (no parent path)', () => {
    expect(buildCommentPath('', rootId)).toBe(rootId)
  })

  it('appends the id to a parent path for a reply', () => {
    expect(buildCommentPath(rootId, childId)).toBe(`${rootId}/${childId}`)
  })

  it('keeps appending for deeper nesting', () => {
    const childPath = `${rootId}/${childId}`
    const grandchildPath = `${childPath}/${grandchildId}`
    expect(buildCommentPath(childPath, grandchildId)).toBe(grandchildPath)
    expect(buildCommentPath(grandchildPath, fourthId)).toBe(`${grandchildPath}/${fourthId}`)
  })
})

describe('parseAncestorIds', () => {
  it('returns an empty list for a root comment', () => {
    expect(parseAncestorIds(rootId, rootId)).toEqual([])
  })

  it('returns ancestors root-first, excluding the comment itself', () => {
    expect(parseAncestorIds(`${rootId}/${childId}/${grandchildId}`, grandchildId))
      .toEqual([rootId, childId])
  })

  it('handles a single-parent reply', () => {
    expect(parseAncestorIds(`${rootId}/${childId}`, childId)).toEqual([rootId])
  })

  it('round-trips with buildCommentPath', () => {
    const path = buildCommentPath(buildCommentPath(rootId, childId), grandchildId)
    expect(path).toBe(`${rootId}/${childId}/${grandchildId}`)
    expect(parseAncestorIds(path, grandchildId)).toEqual([rootId, childId])
  })

  it('drops empty path segments defensively', () => {
    expect(parseAncestorIds(`${rootId}//${grandchildId}`, grandchildId)).toEqual([rootId])
  })
})
