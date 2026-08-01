import { describe, it, expect } from 'vitest'
import { resolveCommentNotificationRecipients } from '~~/server/utils/notificationRecipients'

/**
 * The notification rules (R1-R4) as a pure function. These decide who gets
 * notified about a comment or reply, based on content ownership and discussion
 * involvement, so they are worth pinning down independently of the database.
 */

describe('resolveCommentNotificationRecipients', () => {
  it('R1: notifies the article owner when someone comments on an article', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 'user-5',
      articleOwnerId: 'user-1',
      parentCommentAuthorId: null,
    })

    expect(recipients).toEqual(['user-1'])
  })

  it('R2 + R3: a reply notifies both the parent comment owner and the article owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 5,
      articleOwnerId: 1,
      parentCommentAuthorId: 'user-2',
    })

    expect([...recipients].sort()).toEqual(['user-1', 'user-2'])
  })

  it('R4: never notifies the actor when they comment on their own article', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 'user-1',
      articleOwnerId: 1,
      parentCommentAuthorId: null,
    })

    expect(recipients).toEqual([])
  })

  it('R4: never notifies the actor when they reply to themselves', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 'user-2',
      articleOwnerId: 1,
      parentCommentAuthorId: 2,
    })

    // Only the article owner is left; the actor (the parent owner here) is dropped.
    expect(recipients).toEqual([1])
  })

  it('R4: de-duplicates when the article owner is also the parent comment owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 5,
      articleOwnerId: 1,
      parentCommentAuthorId: 'user-1',
    })

    expect(recipients).toEqual([1])
  })

  it('R4: the article owner replying to their own thread notifies only the parent owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 1,
      articleOwnerId: 1,
      parentCommentAuthorId: 2,
    })

    expect(recipients).toEqual(['user-2'])
  })

  it('returns an empty list when the actor is the only candidate', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: 1,
      articleOwnerId: 1,
      parentCommentAuthorId: 1,
    })

    expect(recipients).toEqual([])
  })
})
