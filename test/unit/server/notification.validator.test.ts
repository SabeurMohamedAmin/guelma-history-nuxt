import { describe, expect, it } from 'vitest'
import {
  createMuteSchema,
  muteIdSchema,
  notificationIdSchema,
} from '~~/server/validators/notification.validator'

const articleId = '70000000-0000-4000-8000-000000000001'
const commentId = '71000000-0000-4000-8000-000000000001'
const rowId = '72000000-0000-4000-8000-000000000001'

describe('notification UUID validation', () => {
  it('accepts UUID route identifiers', () => {
    expect(notificationIdSchema.parse(rowId)).toBe(rowId)
    expect(muteIdSchema.parse(rowId)).toBe(rowId)
  })

  it('rejects numeric and ad-hoc route identifiers', () => {
    expect(notificationIdSchema.safeParse('42').success).toBe(false)
    expect(muteIdSchema.safeParse('mute-1').success).toBe(false)
  })

  it('accepts only the UUID target required by the mute scope', () => {
    expect(createMuteSchema.parse({ scope: 'article', articleId }))
      .toEqual({ scope: 'article', articleId })
    expect(createMuteSchema.parse({ scope: 'comment', commentId }))
      .toEqual({ scope: 'comment', commentId })
  })

  it('rejects malformed or mismatched mute targets', () => {
    expect(createMuteSchema.safeParse({ scope: 'article', articleId: '7' }).success).toBe(false)
    expect(createMuteSchema.safeParse({ scope: 'comment', articleId }).success).toBe(false)
    expect(createMuteSchema.safeParse({ scope: 'all', commentId }).success).toBe(false)
  })
})
