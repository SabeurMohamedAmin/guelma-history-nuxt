import { db } from '~~/server/db'
import { comments as commentsTable } from '~~/server/db/schema'
import { inArray } from 'drizzle-orm'
import { commentIdSchema } from '~~/server/validators/comment.validator'
import { getCommentFocus, serializeComment, getViewerVotes } from '~~/server/utils/comments'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Deep-link / re-root focus fetch: a comment plus its ancestors (root-first,
 * for the "show parent" breadcrumb) and its direct children. Powers opening
 * `?comment=<uuid>` directly and the focus view. Public (guests may read); the
 * viewer's own votes are attached when signed in.
 */
export default defineEventHandler(async (event) => {
  try {
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))

    const focus = await getCommentFocus(id)

    // Hydrate author fields for the whole focus set in one query.
    const all = [focus.comment, ...focus.ancestors, ...focus.children]
    const ids = all.map(c => c.id)
    const withAuthors = await db.query.comments.findMany({
      where: inArray(commentsTable.id, ids),
      with: { author: { columns: { id: true, username: true, displayName: true } } },
    })
    const byId = new Map(withAuthors.map(c => [c.id, c]))
    const serialize = (c: typeof focus.comment) => serializeComment(byId.get(c.id) ?? c)

    const session = await getUserSession(event)
    const votes = await getViewerVotes(session?.user?.id, ids)
    const withVote = (c: typeof focus.comment) => ({ ...serialize(c), viewerVote: votes[c.id] ?? 0 })

    return {
      success: true,
      data: {
        comment: withVote(focus.comment),
        ancestors: focus.ancestors.map(withVote),
        children: focus.children.map(withVote),
      },
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
