import { commentReportRepository } from '~~/server/repositories/comment-report.repository'
import { DELETED_PLACEHOLDER } from '~~/server/utils/comments'

export interface FlaggedCommentResponse {
  commentId: string
  body: string
  isDeleted: boolean
  articleId: string
  author: { id: string, username: string, displayName: string | null } | null
  reportCount: number
  reasons: string[]
  firstReportedAt: string
}

type ReportedComment = {
  id: string
  body: string
  status: 'active' | 'deleted'
  articleId: string
  author: FlaggedCommentResponse['author']
}

export class CommentReportService {
  async countOpen(): Promise<number> {
    return (await this.findOpen()).length
  }

  async findOpen(): Promise<FlaggedCommentResponse[]> {
    const flags = await commentReportRepository.findOpen()
    const grouped = new Map<string, FlaggedCommentResponse>()

    for (const flag of flags) {
      const comment = flag.comment as ReportedComment | null
      if (!comment) continue

      let entry = grouped.get(comment.id)
      if (!entry) {
        entry = {
          commentId: comment.id,
          body: comment.status === 'deleted' ? DELETED_PLACEHOLDER : comment.body,
          isDeleted: comment.status === 'deleted',
          articleId: comment.articleId,
          author: comment.author ?? null,
          reportCount: 0,
          reasons: [],
          firstReportedAt: flag.createdAt.toISOString(),
        }
        grouped.set(comment.id, entry)
      }

      entry.reportCount += 1
      if (flag.reason) entry.reasons.push(flag.reason)
      if (flag.createdAt.toISOString() < entry.firstReportedAt) {
        entry.firstReportedAt = flag.createdAt.toISOString()
      }
    }

    return [...grouped.values()].sort((a, b) => b.reportCount - a.reportCount)
  }

  async resolve(commentId: string): Promise<{ resolved: number }> {
    return { resolved: await commentReportRepository.resolveOpen(commentId) }
  }
}

export const commentReportService = new CommentReportService()
