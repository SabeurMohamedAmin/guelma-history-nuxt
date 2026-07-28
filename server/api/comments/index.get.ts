import { listCommentsSchema } from '~~/server/validators/comment.validator'
import { db } from '~~/server/db'
import { comments as commentsTable } from '~~/server/db/schema'
import { inArray } from 'drizzle-orm'
import { listComments, listDescendants, serializeComment, getViewerVotes } from '~~/server/utils/comments'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * List the root comments of an article, sorted (new/top/controversial, either
 * direction) and paginated for the load-more button. Public: guests may read,
 * so this is unauthenticated, but we attach the viewer's own votes when a
 * session is present so the client can highlight their arrows.
 */
export default defineEventHandler(async (event) => {
  try {
    const query = listCommentsSchema.parse(getQuery(event))
    const { comments: roots, nextCursor } = await listComments(query)

    // Pull every reply (any depth) of the listed roots so the thread renders
    // fully; the client builds the tree from parentId. nextCursor pages roots.
    const replies = await listDescendants(roots.map(c => c.id))
    const all = [...roots, ...replies]
    const ids = all.map(c => c.id)

    // Hydrate author display fields for the whole set in one query.
    const withAuthors = ids.length
      ? await db.query.comments.findMany({
          where: inArray(commentsTable.id, ids),
          with: { author: { columns: { id: true, username: true, displayName: true } } },
        })
      : []
    const byId = new Map(withAuthors.map(c => [c.id, c]))

    const session = await getUserSession(event)
    const votes = await getViewerVotes(session?.user?.id, ids)

    const data = all.map((c) => {
      const serialized = serializeComment(byId.get(c.id) ?? c)
      return { ...serialized, viewerVote: votes[c.id] ?? 0 }
    })

    return { success: true, data, nextCursor }
  }
  catch (error) {
    return toH3Error(error)
  }
})
