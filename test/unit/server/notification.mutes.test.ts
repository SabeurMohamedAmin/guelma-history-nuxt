import { describe, it, expect } from 'vitest'
import { filterMutedRecipients } from '~~/server/utils/notificationMutes'
import type { MuteRecord } from '~~/server/utils/notificationMutes'

/**
 * Rule R5: recipients who muted the target are dropped before notifications are
 * inserted. This is the pure decision (which mute silences which target),
 * tested without a database.
 */

const userA = '60000000-0000-4000-8000-000000000001'
const userB = '60000000-0000-4000-8000-000000000002'
const userC = '60000000-0000-4000-8000-000000000003'
const articleA = '61000000-0000-4000-8000-000000000001'
const articleB = '61000000-0000-4000-8000-000000000002'
const commentA = '62000000-0000-4000-8000-000000000001'
const commentB = '62000000-0000-4000-8000-000000000002'
const target = { articleId: articleA, commentId: commentA }

describe('filterMutedRecipients', () => {
  it('keeps everyone when there are no mutes', () => {
    expect(filterMutedRecipients([userA, userB, userC], [], target)).toEqual([userA, userB, userC])
  })

  it('drops a recipient who muted everything (\'all\')', () => {
    const mutes: MuteRecord[] = [{ userId: userB, scope: 'all', articleId: null, commentId: null }]
    expect(filterMutedRecipients([userA, userB, userC], mutes, target)).toEqual([userA, userC])
  })

  it('drops a recipient who muted THIS article', () => {
    const mutes: MuteRecord[] = [{ userId: userA, scope: 'article', articleId: articleA, commentId: null }]
    expect(filterMutedRecipients([userA, userB], mutes, target)).toEqual([userB])
  })

  it('keeps a recipient who muted a DIFFERENT article', () => {
    const mutes: MuteRecord[] = [{ userId: userA, scope: 'article', articleId: articleB, commentId: null }]
    expect(filterMutedRecipients([userA, userB], mutes, target)).toEqual([userA, userB])
  })

  it('drops a recipient who muted THIS comment thread', () => {
    const mutes: MuteRecord[] = [{ userId: userB, scope: 'comment', articleId: null, commentId: commentA }]
    expect(filterMutedRecipients([userA, userB], mutes, target)).toEqual([userA])
  })

  it('keeps a recipient who muted a DIFFERENT comment thread', () => {
    const mutes: MuteRecord[] = [{ userId: userB, scope: 'comment', articleId: null, commentId: commentB }]
    expect(filterMutedRecipients([userA, userB], mutes, target)).toEqual([userA, userB])
  })

  it('drops a recipient with multiple mutes when any one matches', () => {
    const mutes: MuteRecord[] = [
      { userId: userA, scope: 'article', articleId: articleB, commentId: null },
      { userId: userA, scope: 'comment', articleId: null, commentId: commentA },
    ]
    expect(filterMutedRecipients([userA, userB], mutes, target)).toEqual([userB])
  })
})
