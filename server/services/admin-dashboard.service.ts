import { articleService } from '~~/server/services/article.service'
import { authorService } from '~~/server/services/author.service'
import { categoryService } from '~~/server/services/category.service'
import { commentReportService } from '~~/server/services/comment-report.service'
import { subscriberService } from '~~/server/services/subscriber.service'

/** Read-only dashboard aggregation. It returns only real persisted metrics. */
export class AdminDashboardService {
  async getDashboard() {
    const [
      articleCount,
      categoryCount,
      authorCount,
      subscriberCount,
      recentArticles,
      unresolvedReportCount,
    ] = await Promise.all([
      articleService.count(),
      categoryService.count(),
      authorService.count(),
      subscriberService.count(),
      articleService.getRecent(5),
      commentReportService.countOpen(),
    ])

    return {
      counts: {
        articles: articleCount,
        categories: categoryCount,
        authors: authorCount,
        subscribers: subscriberCount,
        unresolvedReports: unresolvedReportCount,
      },
      recentArticles: recentArticles.map(article => ({
        ...article,
        createdAt: article.createdAt instanceof Date
          ? article.createdAt.toISOString()
          : article.createdAt,
      })),
    }
  }
}

export const adminDashboardService = new AdminDashboardService()
