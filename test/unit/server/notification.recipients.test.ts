import { describe, it, expect } from 'vitest'
import { resolveCommentNotificationRecipients } from '~~/server/utils/notificationRecipients'

/**
 * The notification rules (R1-R4) as a pure function. These decide who gets
 * notified about a comment or reply, based on content ownership and discussion
 * involvement, so they are worth pinning down independently of the database.
 */

const ownerId = '30000000-0000-4000-8000-000000000001'
const parentAuthorId = '30000000-0000-4000-8000-000000000002'
const actorId = '30000000-0000-4000-8000-000000000005'

describe('resolveCommentNotificationRecipients', () => {
  it('R1: notifies the article owner when someone comments on an article', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: null,
    })

    expect(recipients).toEqual([ownerId])
  })

  it('R2 + R3: a reply notifies both the parent comment owner and the article owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: parentAuthorId,
    })

    expect([...recipients].sort()).toEqual([ownerId, parentAuthorId].sort())
  })

  it('R4: never notifies the actor when they comment on their own article', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: ownerId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: null,
    })

    expect(recipients).toEqual([])
  })

  it('R4: never notifies the actor when they reply to themselves', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: parentAuthorId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: parentAuthorId,
    })

    expect(recipients).toEqual([ownerId])
  })

  it('R4: de-duplicates when the article owner is also the parent comment owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: ownerId,
    })

    expect(recipients).toEqual([ownerId])
  })

  it('R4: the article owner replying to their own thread notifies only the parent owner', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: ownerId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: parentAuthorId,
    })

    expect(recipients).toEqual([parentAuthorId])
  })

  it('returns an empty list when the actor is the only candidate', () => {
    const recipients = resolveCommentNotificationRecipients({
      actorId: ownerId,
      articleOwnerId: ownerId,
      parentCommentAuthorId: ownerId,
    })

    expect(recipients).toEqual([])
  })
})
