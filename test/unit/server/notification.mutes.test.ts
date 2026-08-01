import { describe, it, expect } from 'vitest'
import { filterMutedRecipients } from '~~/server/utils/notificationMutes'
import type { MuteRecord } from '~~/server/utils/notificationMutes'

/**
 * Rule R5: recipients who muted the target are dropped before notifications are
 * inserted. This is the pure decision (which mute silences which target),
 * tested without a database.
 */

const target = { articleId: 'article-10', commentId: 'c-1' }

describe('filterMutedRecipients', () => {
  it('keeps everyone when there are no mutes', () => {
    expect(filterMutedRecipients(['user-1', 'user-2', 'user-3'], [], target)).toEqual([1, 2, 3])
  })

  it('drops a recipient who muted everything (\'all\')', () => {
    const mutes: MuteRecord[] = [{ userId: 'user-2', scope: 'all', articleId: null, commentId: null }]
    expect(filterMutedRecipients([1, 2, 3], mutes, target)).toEqual(['user-1', 'user-3'])
  })

  it('drops a recipient who muted THIS article', () => {
    const mutes: MuteRecord[] = [{ userId: 'user-1', scope: 'article', articleId: 'article-10', commentId: null }]
    expect(filterMutedRecipients(['user-1', 'user-2'], mutes, target)).toEqual(['user-2'])
  })

  it('keeps a recipient who muted a DIFFERENT article', () => {
    const mutes: MuteRecord[] = [{ userId: 1, scope: 'article', articleId: 'article-99', commentId: null }]
    expect(filterMutedRecipients([1, 2], mutes, target)).toEqual([1, 2])
  })

  it('drops a recipient who muted THIS comment thread', () => {
    const mutes: MuteRecord[] = [{ userId: 2, scope: 'comment', articleId: null, commentId: 'c-1' }]
    expect(filterMutedRecipients([1, 2], mutes, target)).toEqual(['user-1'])
  })

  it('keeps a recipient who muted a DIFFERENT comment thread', () => {
    const mutes: MuteRecord[] = [{ userId: 2, scope: 'comment', articleId: null, commentId: 'c-other' }]
    expect(filterMutedRecipients([1, 2], mutes, target)).toEqual([1, 2])
  })

  it('drops a recipient with multiple mutes when any one matches', () => {
    const mutes: MuteRecord[] = [
      { userId: 1, scope: 'article', articleId: 99, commentId: null },
      { userId: 1, scope: 'comment', articleId: null, commentId: 'c-1' },
    ]
    expect(filterMutedRecipients([1, 2], mutes, target)).toEqual([2])
  })
})
