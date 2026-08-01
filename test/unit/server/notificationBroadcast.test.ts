import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  userTopic,
  addNotificationPeer,
  removeNotificationPeer,
  publishNotificationEvent,
  type NotificationEvent,
} from '~~/server/utils/notificationBroadcast'

/**
 * Realtime fan-out for per-user notifications: the in-memory peer registry the
 * websocket channel and the emitter share. The socket is one-way, so all that
 * needs verifying is room membership (per user) and that a push reaches exactly
 * the right subscribers without throwing back into the caller.
 */

/** A fake crossws peer that records what it was sent. */
function fakePeer() {
  return { send: vi.fn((_data: string) => {}) }
}

const userA = '40000000-0000-4000-8000-000000000001'
const userB = '40000000-0000-4000-8000-000000000002'
const sampleEvent: NotificationEvent = {
  type: 'created',
  notification: {
    id: '41000000-0000-4000-8000-000000000001',
    type: 'comment_reply',
    isRead: false,
    articleId: '42000000-0000-4000-8000-000000000001',
    // The slug builds the deep link (/articles/<slug>).
    articleSlug: 'guelma-history',
    commentId: '43000000-0000-4000-8000-000000000001',
    createdAt: '2026-01-01T00:00:00.000Z',
    actor: null,
  },
}

beforeEach(() => {
  // Empty the shared registry between tests so rooms never leak across cases.
  // The module holds this Map in a const, so we CLEAR it instead of assigning a
  // fresh Map to globalThis (which would leave the module on the old instance).
  const registry = (globalThis as Record<string, unknown>).__notificationPeers as Map<string, unknown> | undefined
  registry?.clear()
})

describe('userTopic', () => {
  it('namespaces a room per user id', () => {
    expect(userTopic(userA)).toBe(`notifications:${userA}`)
    expect(userTopic(userA)).not.toBe(userTopic(userB))
  })
})

describe('publishNotificationEvent', () => {
  it('sends the JSON-encoded event to every peer in the user room', () => {
    const a = fakePeer()
    const b = fakePeer()
    addNotificationPeer(userTopic(userA), a)
    addNotificationPeer(userTopic('user-7'), b)

    publishNotificationEvent(userA, sampleEvent)

    expect(a.send).toHaveBeenCalledOnce()
    expect(b.send).toHaveBeenCalledOnce()
    expect(a.send).toHaveBeenCalledWith(JSON.stringify(sampleEvent))
  })

  it('isolates rooms: a user only hears their own notifications', () => {
    const me = fakePeer()
    const otherUser = fakePeer()
    addNotificationPeer(userTopic('user-7'), me)
    addNotificationPeer(userTopic(userB), otherUser)

    publishNotificationEvent('user-7', sampleEvent)

    expect(me.send).toHaveBeenCalledOnce()
    expect(otherUser.send).not.toHaveBeenCalled()
  })

  it('is a no-op when the user has no connected tabs', () => {
    expect(() => publishNotificationEvent('40000000-0000-4000-8000-000000000099', sampleEvent)).not.toThrow()
  })

  it('stops delivering to a peer after it is removed', () => {
    const peer = fakePeer()
    addNotificationPeer(userTopic('user-7'), peer)
    removeNotificationPeer(peer)

    publishNotificationEvent('user-7', sampleEvent)

    expect(peer.send).not.toHaveBeenCalled()
  })

  it('drops a broken peer without failing the publish or other peers', () => {
    const broken = {
      send: vi.fn(() => {
        throw new Error('socket closed')
      }),
    }
    const healthy = fakePeer()
    addNotificationPeer(userTopic('user-7'), broken)
    addNotificationPeer(userTopic('user-7'), healthy)

    // A throwing socket must not break the insert that triggered the event.
    expect(() => publishNotificationEvent('user-7', sampleEvent)).not.toThrow()
    expect(healthy.send).toHaveBeenCalledOnce()

    // The broken peer was dropped, so a second publish does not reach it again.
    broken.send.mockClear()
    publishNotificationEvent('user-7', sampleEvent)
    expect(broken.send).not.toHaveBeenCalled()
  })
})
