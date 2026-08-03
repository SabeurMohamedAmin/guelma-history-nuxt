import { and, eq, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { commentFlags } from '~~/server/db/schema'

export class CommentReportRepository {
  findOpen() {
    return db.query.commentFlags.findMany({
      where: sql`${commentFlags.resolvedAt} is null`,
      with: {
        comment: {
          with: { author: { columns: { id: true, username: true, displayName: true } } },
        },
      },
    })
  }

  async resolveOpen(commentId: string): Promise<number> {
    const rows = await db.update(commentFlags)
      .set({ resolvedAt: new Date() })
      .where(and(
        eq(commentFlags.commentId, commentId),
        sql`${commentFlags.resolvedAt} is null`,
      ))
      .returning({ id: commentFlags.id })

    return rows.length
  }
}

export const commentReportRepository = new CommentReportRepository()
