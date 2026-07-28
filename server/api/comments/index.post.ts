import { createCommentSchema } from '~~/server/validators/comment.validator'
import { createComment, serializeComment } from '~~/server/utils/comments'
import { publishCommentEvent } from '~~/server/utils/commentBroadcast'
import { emitCommentNotifications } from '~~/server/utils/notifications'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Create a comment or a reply. Requires a completed user/author/admin account
 * (guests are rejected by the domain guard). Returns the created comment in the
 * serialized public shape so the client can insert it optimistically.
 */
export default defineEventHandler(async (event) => {
  try {
    const input = createCommentSchema.parse(await readBody(event))
    const created = await createComment(event, input)
    const data = serializeComment(created)
    // Rooms are keyed by the article slug — the same value the client
    // subscribed with over the websocket.
    publishCommentEvent(input.articleSlug, { type: 'created', comment: data })
    // Notify involved users (article owner, parent comment owner). Fire-and-
    // forget: this swallows its own errors and must never fail the write.
    await emitCommentNotifications({
      id: created.id,
      articleId: created.articleId,
      parentId: created.parentId,
      authorId: created.authorId,
    })
    return { success: true, data }
  }
  catch (error) {
    return toH3Error(error)
  }
})
