import { describe, it, expect } from 'vitest'
import {
  COMMENT_MAX_LENGTH,
  createCommentSchema,
  editCommentSchema,
  voteCommentSchema,
  listCommentsSchema,
  flagCommentSchema,
} from '~~/server/validators/comment.validator'

describe('createCommentSchema', () => {
  it('accepts a valid top-level comment', () => {
    const result = createCommentSchema.parse({ articleSlug: 'hello-world', body: 'Hello' })
    expect(result.body).toBe('Hello')
    expect(result.parentId).toBeUndefined()
  })

  it('sanitizes the body before validating (invisible-only is rejected)', () => {
    expect(() => createCommentSchema.parse({ articleSlug: 'hello-world', body: '\u200b\u200b' })).toThrow()
  })

  it('rejects an empty or whitespace-only body', () => {
    expect(() => createCommentSchema.parse({ articleSlug: 'hello-world', body: '   ' })).toThrow()
  })

  it(`rejects a body longer than ${COMMENT_MAX_LENGTH} characters`, () => {
    const tooLong = 'a'.repeat(COMMENT_MAX_LENGTH + 1)
    expect(() => createCommentSchema.parse({ articleSlug: 'hello-world', body: tooLong })).toThrow()
  })

  it('accepts a body exactly at the limit', () => {
    const exact = 'a'.repeat(COMMENT_MAX_LENGTH)
    expect(createCommentSchema.parse({ articleSlug: 'hello-world', body: exact }).body).toHaveLength(COMMENT_MAX_LENGTH)
  })

  it('allows a nullable uuid parentId for replies', () => {
    const parentId = '4e9a1c1a-2f5b-4d0c-9a1e-8b2d3c4f5a6b'
    expect(createCommentSchema.parse({ articleSlug: 'hello-world', parentId, body: 'hi' }).parentId).toBe(parentId)
    expect(createCommentSchema.parse({ articleSlug: 'hello-world', parentId: null, body: 'hi' }).parentId).toBeNull()
  })

  it('trims and keeps a valid article slug', () => {
    expect(createCommentSchema.parse({ articleSlug: '  massacres-8-mai-1945-guelma  ', body: 'hi' }).articleSlug)
      .toBe('massacres-8-mai-1945-guelma')
  })

  it('rejects an invalid article slug', () => {
    expect(() => createCommentSchema.parse({ articleSlug: '', body: 'hi' })).toThrow()
    expect(() => createCommentSchema.parse({ articleSlug: 'not a slug!', body: 'hi' })).toThrow()
  })
})

describe('editCommentSchema', () => {
  it('requires a non-empty body', () => {
    expect(editCommentSchema.parse({ body: 'updated' }).body).toBe('updated')
    expect(() => editCommentSchema.parse({ body: '' })).toThrow()
  })
})

describe('voteCommentSchema', () => {
  it('accepts only -1, 0 and 1', () => {
    expect(voteCommentSchema.parse({ value: 1 }).value).toBe(1)
    expect(voteCommentSchema.parse({ value: 0 }).value).toBe(0)
    expect(voteCommentSchema.parse({ value: -1 }).value).toBe(-1)
    expect(() => voteCommentSchema.parse({ value: 2 })).toThrow()
  })
})

describe('listCommentsSchema', () => {
  it('defaults to new / desc with a sensible limit', () => {
    const q = listCommentsSchema.parse({ articleSlug: 'hello-world' })
    expect(q.sort).toBe('new')
    expect(q.order).toBe('desc')
    expect(q.limit).toBe(10)
  })

  it('rejects an unknown sort', () => {
    expect(() => listCommentsSchema.parse({ articleSlug: 'hello-world', sort: 'best' })).toThrow()
  })

  it('rejects a limit above the cap', () => {
    expect(() => listCommentsSchema.parse({ articleSlug: 'hello-world', limit: 999 })).toThrow()
  })
})

describe('flagCommentSchema', () => {
  it('allows an empty reason', () => {
    expect(flagCommentSchema.parse({ reason: '' }).reason).toBe('')
    expect(flagCommentSchema.parse({}).reason).toBeUndefined()
  })

  it('rejects an over-long reason', () => {
    expect(() => flagCommentSchema.parse({ reason: 'x'.repeat(501) })).toThrow()
  })
})
