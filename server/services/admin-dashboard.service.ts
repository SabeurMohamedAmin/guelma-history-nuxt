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
      // ArticleService already returns a transport-safe compact shape whose
      // publishedAt value is an ISO string.
      recentArticles,
    }
  }
}

export const adminDashboardService = new AdminDashboardService()
