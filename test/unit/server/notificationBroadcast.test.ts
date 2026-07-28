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

const sampleEvent: NotificationEvent = {
  type: 'created',
  notification: {
    id: 'n-1',
    type: 'comment_reply',
    isRead: false,
    articleId: 10,
    // The slug builds the deep link (/articles/<slug>).
    articleSlug: 'guelma-history',
    commentId: 'c-1',
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
    expect(userTopic(12)).toBe('notifications:user:12')
    expect(userTopic(12)).not.toBe(userTopic(13))
  })
})

describe('publishNotificationEvent', () => {
  it('sends the JSON-encoded event to every peer in the user room', () => {
    const a = fakePeer()
    const b = fakePeer()
    addNotificationPeer(userTopic(7), a)
    addNotificationPeer(userTopic(7), b)

    publishNotificationEvent(7, sampleEvent)

    expect(a.send).toHaveBeenCalledOnce()
    expect(b.send).toHaveBeenCalledOnce()
    expect(a.send).toHaveBeenCalledWith(JSON.stringify(sampleEvent))
  })

  it('isolates rooms: a user only hears their own notifications', () => {
    const me = fakePeer()
    const otherUser = fakePeer()
    addNotificationPeer(userTopic(7), me)
    addNotificationPeer(userTopic(99), otherUser)

    publishNotificationEvent(7, sampleEvent)

    expect(me.send).toHaveBeenCalledOnce()
    expect(otherUser.send).not.toHaveBeenCalled()
  })

  it('is a no-op when the user has no connected tabs', () => {
    expect(() => publishNotificationEvent(123, sampleEvent)).not.toThrow()
  })

  it('stops delivering to a peer after it is removed', () => {
    const peer = fakePeer()
    addNotificationPeer(userTopic(7), peer)
    removeNotificationPeer(peer)

    publishNotificationEvent(7, sampleEvent)

    expect(peer.send).not.toHaveBeenCalled()
  })

  it('drops a broken peer without failing the publish or other peers', () => {
    const broken = {
      send: vi.fn(() => {
        throw new Error('socket closed')
      }),
    }
    const healthy = fakePeer()
    addNotificationPeer(userTopic(7), broken)
    addNotificationPeer(userTopic(7), healthy)

    // A throwing socket must not break the insert that triggered the event.
    expect(() => publishNotificationEvent(7, sampleEvent)).not.toThrow()
    expect(healthy.send).toHaveBeenCalledOnce()

    // The broken peer was dropped, so a second publish does not reach it again.
    broken.send.mockClear()
    publishNotificationEvent(7, sampleEvent)
    expect(broken.send).not.toHaveBeenCalled()
  })
})
