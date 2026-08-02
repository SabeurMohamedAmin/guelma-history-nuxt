import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  articleTopic,
  addCommentPeer,
  removeCommentPeer,
  publishCommentEvent,
  type CommentBroadcastEvent,
} from '~~/server/utils/commentBroadcast'

/**
 * Realtime fan-out: the in-memory peer registry the websocket channel and the
 * REST handlers share. The socket is read-only for clients, so all that needs
 * verifying here is room membership and that a successful REST write fans the
 * event out to exactly the right subscribers — never throwing back into the
 * caller if a socket is broken.
 */

/** A fake crossws peer that records what it was sent. */
function fakePeer() {
  return { send: vi.fn((_data: string) => {}) }
}

/** Rooms are keyed by the article's public slug — the value the client subscribes with. */
const ARTICLE = 'guelma-history'
const OTHER_ARTICLE = 'another-article'

const sampleEvent: CommentBroadcastEvent = {
  type: 'voted',
  // Comment ids are uuid strings.
  vote: {
    commentId: '50000000-0000-4000-8000-000000000001',
    upvotes: 3,
    downvotes: 1,
    score: 2,
  },
}

beforeEach(() => {
  // Empty the shared registry between tests so rooms never leak across cases.
  // The module holds this Map in a const, so we CLEAR it instead of assigning a
  // fresh Map to globalThis (which would leave the module on the old instance).
  const registry = (globalThis as Record<string, unknown>).__commentPeers as Map<string, unknown> | undefined
  registry?.clear()
})

describe('articleTopic', () => {
  it('namespaces a room per article slug', () => {
    expect(articleTopic(ARTICLE)).toBe(`comments:article:${ARTICLE}`)
    expect(articleTopic(ARTICLE)).not.toBe(articleTopic(OTHER_ARTICLE))
  })
})

describe('publishCommentEvent', () => {
  it('sends the JSON-encoded event to every peer in the room', () => {
    const a = fakePeer()
    const b = fakePeer()
    addCommentPeer(articleTopic(ARTICLE), a)
    addCommentPeer(articleTopic(ARTICLE), b)

    publishCommentEvent(ARTICLE, sampleEvent)

    expect(a.send).toHaveBeenCalledOnce()
    expect(b.send).toHaveBeenCalledOnce()
    expect(a.send).toHaveBeenCalledWith(JSON.stringify(sampleEvent))
  })

  it('isolates rooms: a peer only hears its own article', () => {
    const inRoom = fakePeer()
    const otherRoom = fakePeer()
    addCommentPeer(articleTopic(ARTICLE), inRoom)
    addCommentPeer(articleTopic(OTHER_ARTICLE), otherRoom)

    publishCommentEvent(ARTICLE, sampleEvent)

    expect(inRoom.send).toHaveBeenCalledOnce()
    expect(otherRoom.send).not.toHaveBeenCalled()
  })

  it('is a no-op when the room has no subscribers', () => {
    expect(() => publishCommentEvent('unwatched-article', sampleEvent)).not.toThrow()
  })

  it('stops delivering to a peer after it is removed', () => {
    const peer = fakePeer()
    addCommentPeer(articleTopic(ARTICLE), peer)
    removeCommentPeer(peer)

    publishCommentEvent(ARTICLE, sampleEvent)

    expect(peer.send).not.toHaveBeenCalled()
  })

  it('drops a broken peer without failing the publish or other peers', () => {
    const broken = {
      send: vi.fn(() => {
        throw new Error('socket closed')
      }),
    }
    const healthy = fakePeer()
    addCommentPeer(articleTopic(ARTICLE), broken)
    addCommentPeer(articleTopic(ARTICLE), healthy)

    // A throwing socket must not break the REST write that triggered the event.
    expect(() => publishCommentEvent(ARTICLE, sampleEvent)).not.toThrow()
    expect(healthy.send).toHaveBeenCalledOnce()

    // The broken peer was dropped, so a second publish does not reach it again.
    broken.send.mockClear()
    publishCommentEvent(ARTICLE, sampleEvent)
    expect(broken.send).not.toHaveBeenCalled()
  })
})
