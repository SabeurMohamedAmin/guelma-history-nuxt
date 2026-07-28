import type {
  CommentEvent,
  CommentNode,
  CommentSort,
  CommentSortOrder,
} from '~~/shared/types/comment'

interface ListResponse {
  success: boolean
  data: CommentNode[]
  // Keyset cursor: the createdAt ISO timestamp of the last root seen. UUID ids
  // are not time-ordered, so the server pages on createdAt, not on id.
  nextCursor: string | null
}

interface MutationResponse {
  success: boolean
  data: CommentNode
}

interface FocusResponse {
  success: boolean
  data: {
    comment: CommentNode
    ancestors: CommentNode[]
    children: CommentNode[]
  }
}

/**
 * Owns the comment thread state for a single article.
 *
 * Responsibilities:
 * - fetch the sorted, load-more-paginated root list,
 * - create / reply / edit / delete / vote / flag (with optimistic updates),
 * - keep a live connection: subscribe to the article's websocket room and
 *   merge created/updated/deleted/voted events into the local list.
 *
 * Sort + order live in the URL (shareable, back-button friendly), mirroring the
 * useArticles pattern. Replies are loaded lazily per-parent by the components
 * that expand a thread; this composable holds the flat list keyed by id, and
 * exposes helpers to read children, so the tree can be assembled in the view.
 */
export function useComments(articleSlug: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const router = useRouter()
  const slug = computed(() => toValue(articleSlug))

  const SORTS: CommentSort[] = ['new', 'top', 'controversial']
  const sort = ref<CommentSort>(
    SORTS.includes(route.query.sort as CommentSort) ? (route.query.sort as CommentSort) : 'new',
  )
  const order = ref<CommentSortOrder>(route.query.order === 'asc' ? 'asc' : 'desc')

  // The focused comment id (a UUID string), driven by the ?comment= query so the
  // focus/re-root view is shareable and works with the browser back button.
  // null = the normal root list.
  const focusId = computed<string | null>(() => {
    const raw = route.query.comment
    return typeof raw === 'string' && raw.length > 0 ? raw : null
  })
  const isFocused = computed(() => focusId.value !== null)
  // Ancestors of the focused comment, root-first, for the "show parent" breadcrumb.
  const focusAncestors = ref<CommentNode[]>([])

  // Flat map of every comment we know about, keyed by id (uuid). The view builds
  // the tree from parentId; keeping it flat makes realtime merges O(1).
  const byId = ref<Map<string, CommentNode>>(new Map())
  const rootIds = ref<string[]>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)
  const error = ref<string | null>(null)

  // Comments with a vote request currently in flight. Used to debounce repeat
  // clicks and to ignore the realtime self-echo while the POST is resolving.
  const voting = ref<Set<string>>(new Set())

  const PAGE_SIZE = 10

  const roots = computed<CommentNode[]>(() =>
    rootIds.value.map(rid => byId.value.get(rid)).filter((c): c is CommentNode => Boolean(c)),
  )
  const hasMore = computed(() => nextCursor.value !== null)

  /** The focused comment node (when in focus view), or undefined. */
  const focusComment = computed<CommentNode | undefined>(() =>
    focusId.value !== null ? byId.value.get(focusId.value) : undefined,
  )

  /** Direct replies of a comment, sorted oldest-first for stable reading. */
  function repliesOf(parentId: string): CommentNode[] {
    return [...byId.value.values()]
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  function upsert(node: CommentNode) {
    byId.value.set(node.id, node)
  }

  /** Load the first page (replaces the list), used on mount and on sort change. */
  async function load() {
    pending.value = true
    error.value = null
    try {
      const res = await $fetch<ListResponse>('/api/comments', {
        query: { articleSlug: slug.value, sort: sort.value, order: order.value, limit: PAGE_SIZE },
      })
      // res.data holds roots AND their replies (flat); seed all, but only the
      // parentId === null entries are roots. Replies render via repliesOf().
      byId.value = new Map(res.data.map(c => [c.id, c]))
      rootIds.value = res.data.filter(c => c.parentId === null).map(c => c.id)
      nextCursor.value = res.nextCursor
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load comments.'
    }
    finally {
      pending.value = false
    }
  }

  /**
   * Load a single comment plus its ancestors and direct children for the focus
   * / re-root view (and the ?comment= deep link). Seeds everything into the
   * flat map so the recursive renderer can read children normally.
   */
  async function loadFocus() {
    if (focusId.value === null) return
    pending.value = true
    error.value = null
    try {
      const res = await $fetch<FocusResponse>(`/api/comments/${focusId.value}/focus`)
      const all = [res.data.comment, ...res.data.ancestors, ...res.data.children]
      byId.value = new Map(all.map(c => [c.id, c]))
      focusAncestors.value = res.data.ancestors
      // In focus view the "roots" are just the focused comment.
      rootIds.value = [res.data.comment.id]
      nextCursor.value = null
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load comment.'
    }
    finally {
      pending.value = false
    }
  }

  /** Enter the focus/re-root view for a comment (URL-driven). */
  function focus(commentId: string) {
    void router.push({ query: { ...route.query, comment: commentId } })
  }

  /** Leave the focus view and return to the root list. */
  function clearFocus() {
    const query = { ...route.query }
    delete query.comment
    void router.push({ query })
  }

  /** Append the next page (the load-more button). */
  async function loadMore() {
    if (!hasMore.value || pending.value) return
    pending.value = true
    try {
      const res = await $fetch<ListResponse>('/api/comments', {
        query: {
          articleSlug: slug.value,
          sort: sort.value,
          order: order.value,
          limit: PAGE_SIZE,
          cursor: nextCursor.value ?? undefined,
        },
      })
      // res.data holds the next roots AND their replies (flat). Seed everything;
      // only append parentId === null entries as new roots.
      for (const c of res.data) {
        upsert(c)
        if (c.parentId === null && !rootIds.value.includes(c.id)) rootIds.value.push(c.id)
      }
      nextCursor.value = res.nextCursor
    }
    finally {
      pending.value = false
    }
  }

  // --- Mutations -----------------------------------------------------------

  async function create(body: string, parentId: string | null = null) {
    const res = await $fetch<MutationResponse>('/api/comments', {
      method: 'POST',
      body: { articleSlug: slug.value, parentId, body },
    })
    // The websocket also delivers this; upserting here makes the author's own
    // post appear instantly even if the socket is slow or closed.
    upsert(res.data)
    if (res.data.parentId === null && !rootIds.value.includes(res.data.id)) {
      rootIds.value.unshift(res.data.id)
    }
    return res.data
  }

  async function edit(commentId: string, body: string) {
    const res = await $fetch<MutationResponse>(`/api/comments/${commentId}`, {
      method: 'PATCH',
      body: { body },
    })
    upsert(res.data)
    return res.data
  }

  async function remove(commentId: string) {
    const res = await $fetch<MutationResponse>(`/api/comments/${commentId}`, { method: 'DELETE' })
    upsert(res.data)
    return res.data
  }

  /**
   * Vote with an optimistic update: apply the predicted tally immediately so the
   * arrow feels instant, then reconcile with the server's authoritative result.
   * On error we roll back to the exact pre-click snapshot.
   *
   * Solidity:
   * - `voting` tracks the comments with an in-flight request. A second click on
   *   the same comment is ignored until the first settles, so we never stack
   *   optimistic predictions on top of an unconfirmed state.
   * - The realtime 'voted' broadcast is also delivered to the voter, but it
   *   carries no per-user data and may arrive out of order with the fetch
   *   reply. While a comment is in `voting`, applyEvent skips its 'voted'
   *   broadcast, so the authoritative fetch result is never clobbered.
   */
  async function vote(commentId: string, value: -1 | 0 | 1) {
    const current = byId.value.get(commentId)
    // Ignore re-clicks on a comment whose previous vote is still resolving, and
    // never vote on a deleted comment (the server rejects it anyway).
    if (!current || current.isDeleted || voting.value.has(commentId)) return

    // Resolve the toggle the same way the server does: pressing the active
    // arrow again clears the vote (up -> none); the opposite arrow flips it.
    const nextVote: -1 | 0 | 1 = current.viewerVote === value ? 0 : value
    if (nextVote === current.viewerVote) return // nothing actually changes
    const delta = nextVote - current.viewerVote

    // Predict the new tallies from the vote change before the request resolves.
    const optimistic: CommentNode = {
      ...current,
      upvotes: current.upvotes + (nextVote === 1 ? 1 : 0) - (current.viewerVote === 1 ? 1 : 0),
      downvotes: current.downvotes + (nextVote === -1 ? 1 : 0) - (current.viewerVote === -1 ? 1 : 0),
      score: current.score + delta,
      viewerVote: nextVote,
    }
    voting.value.add(commentId)
    upsert(optimistic)

    try {
      const res = await $fetch<{ success: boolean, data: { commentId: string, upvotes: number, downvotes: number, score: number, userValue: -1 | 0 | 1 } }>(
        `/api/comments/${commentId}/vote`,
        { method: 'POST', body: { value } },
      )
      // Trust the server's authoritative tallies + the viewer's resulting vote,
      // applied over whatever the node looks like now (e.g. an edit may have
      // arrived meanwhile), not over the stale optimistic snapshot.
      const latest = byId.value.get(commentId) ?? optimistic
      upsert({
        ...latest,
        upvotes: res.data.upvotes,
        downvotes: res.data.downvotes,
        score: res.data.score,
        viewerVote: res.data.userValue,
      })
    }
    catch (err) {
      // Roll back to the exact pre-click snapshot if the server rejected it.
      upsert(current)
      error.value = err instanceof Error ? err.message : 'Failed to register your vote.'
    }
    finally {
      // `voting` is an in-memory Set, not a Drizzle table (Set.prototype.delete).

      voting.value.delete(commentId)
    }
  }

  async function flag(commentId: string, reason?: string) {
    await $fetch(`/api/comments/${commentId}/flag`, { method: 'POST', body: { reason: reason ?? '' } })
  }

  // --- Realtime ------------------------------------------------------------

  // Live updates are a bonus: every mutation already goes through the REST API,
  // so the thread stays correct even when the socket cannot connect (a proxy
  // that does not forward the upgrade, a captive network, an offline client).
  const socket = useRealtimeSocket({
    path: '/_ws/comments',
    onOpen: () => socket.send({ type: 'subscribe', articleSlug: slug.value }),
    onMessage: (data) => {
      const evt = data as CommentEvent | { type: 'ready' }
      if (evt.type !== 'ready') applyEvent(evt as CommentEvent)
    },
  })

  function applyEvent(evt: CommentEvent) {
    if (evt.type === 'voted') {
      // The voter receives their own broadcast too, but it carries no per-user
      // data and can arrive out of order with the POST /vote reply. While we
      // have a local vote in flight for this comment, the fetch result is
      // authoritative, so ignore the echo to avoid clobbering it.
      if (voting.value.has(evt.vote.commentId)) return
      const node = byId.value.get(evt.vote.commentId)
      if (node) {
        upsert({ ...node, upvotes: evt.vote.upvotes, downvotes: evt.vote.downvotes, score: evt.vote.score })
      }
      return
    }
    // created / updated / deleted all carry a full node, but the broadcast
    // intentionally omits per-user data, so its viewerVote is always 0. Keep
    // the viewer's existing vote so an edit/delete by anyone does not wipe the
    // highlighted arrow on a comment this viewer already voted on.
    const node = evt.comment
    const existing = byId.value.get(node.id)
    upsert({ ...node, viewerVote: existing?.viewerVote ?? node.viewerVote })
    if (evt.type === 'created' && node.parentId === null && !rootIds.value.includes(node.id)) {
      rootIds.value.unshift(node.id)
    }
  }

  // Refetch + keep the URL in sync when sort/order change (root list only).
  watch([sort, order], () => {
    if (isFocused.value) return
    void router.replace({ query: { ...route.query, sort: sort.value, order: order.value } })
    void load()
  })

  // Switch between the root list and the focus view as ?comment= changes.
  watch(focusId, (value) => {
    if (value !== null) void loadFocus()
    else void load()
  })

  onMounted(() => {
    void (isFocused.value ? loadFocus() : load())
    socket.connect()
  })

  return {
    // state
    sort,
    order,
    roots,
    pending,
    error,
    hasMore,
    // focus / re-root
    isFocused,
    focusComment,
    focusAncestors,
    focus,
    clearFocus,
    // reads
    repliesOf,
    getComment: (cid: string) => byId.value.get(cid),
    // actions
    load,
    loadMore,
    loadFocus,
    create,
    edit,
    remove,
    vote,
    flag,
  }
}
