import { and, desc, eq, isNotNull, lte } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { authors } from '~~/server/db/schema/authors'

/**
 * GET /sitemap.xml
 *
 * Hand-rolled sitemap, so no extra module is needed. Every public URL is listed
 * twice, once per locale, following the i18n strategy 'prefix_except_default':
 * Arabic (the default) has no prefix, French is served under /fr.
 *
 * Each <url> carries xhtml:link alternates so Google treats the Arabic and
 * French versions as translations of one page instead of duplicates.
 */

type SitemapEntry = {
  path: string
  lastmod?: Date | null
  // Relative weight (0.0 - 1.0) used as a hint by crawlers.
  priority: string
  changefreq: 'daily' | 'weekly' | 'monthly'
}

const LOCALES = [
  { code: 'ar', hreflang: 'ar-DZ', prefix: '' },
  { code: 'fr', hreflang: 'fr-FR', prefix: '/fr' },
] as const

// Public, crawlable pages that are not generated from the database.
// Private areas (admin, author, profile, login...) are intentionally absent.
const STATIC_ENTRIES: SitemapEntry[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/articles', priority: '0.9', changefreq: 'daily' },
  { path: '/categories', priority: '0.8', changefreq: 'weekly' },
  { path: '/authors', priority: '0.6', changefreq: 'monthly' },
  { path: '/timeline', priority: '0.7', changefreq: 'weekly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.4', changefreq: 'monthly' },
]

// XML has five characters that must never appear raw inside a document.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrl(siteUrl: string, prefix: string, path: string): string {
  // '/' must not become '/fr/', and no URL should end with a double slash.
  const suffix = path === '/' ? '' : path
  return escapeXml(`${siteUrl}${prefix}${suffix}` || `${siteUrl}/`)
}

function renderEntry(siteUrl: string, entry: SitemapEntry): string {
  const alternates = LOCALES
    .map(locale =>
      `    <xhtml:link rel="alternate" hreflang="${locale.hreflang}" href="${buildUrl(siteUrl, locale.prefix, entry.path)}"/>`,
    )
    .join('\n')

  return LOCALES
    .map((locale) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>`
        : ''

      return [
        '  <url>',
        `    <loc>${buildUrl(siteUrl, locale.prefix, entry.path)}</loc>${lastmod}`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        alternates,
        // x-default tells Google which version to serve to other languages.
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${buildUrl(siteUrl, '', entry.path)}"/>`,
        '  </url>',
      ].join('\n')
    })
    .join('\n')
}

/**
 * URLs that come from the database.
 *
 * Isolated from the handler so a database hiccup can be caught: answering 5xx
 * on /sitemap.xml makes crawlers discard the whole file, while a sitemap that
 * still lists the static pages keeps the site discoverable.
 */
async function loadDatabaseEntries(): Promise<SitemapEntry[]> {
  // Only published articles, and never a future publication date.
  const publishedArticles = await db
    .select({
      slug: articles.slug,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(and(isNotNull(articles.publishedAt), lte(articles.publishedAt, new Date())))
    .orderBy(desc(articles.publishedAt))

  // Categories that actually contain a published article: empty listing pages
  // are thin content and hurt more than they help.
  const categoryRows = await db
    .selectDistinct({ slug: categories.slug })
    .from(categories)
    .innerJoin(articles, eq(articles.categoryId, categories.id))
    .where(isNotNull(articles.publishedAt))

  const authorRows = await db
    .selectDistinct({ slug: authors.slug })
    .from(authors)
    .innerJoin(articles, eq(articles.authorId, authors.id))
    .where(isNotNull(articles.publishedAt))

  return [
    ...publishedArticles.map(article => ({
      path: `/articles/${article.slug}`,
      lastmod: article.updatedAt || article.publishedAt,
      priority: '0.8',
      changefreq: 'monthly' as const,
    })),
    ...categoryRows.map(category => ({
      path: `/categories/${category.slug}`,
      priority: '0.7',
      changefreq: 'weekly' as const,
    })),
    ...authorRows.map(author => ({
      path: `/authors/${author.slug}`,
      priority: '0.5',
      changefreq: 'monthly' as const,
    })),
  ]
}

export default defineEventHandler(async (event) => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')

  let databaseEntries: SitemapEntry[] = []

  try {
    databaseEntries = await loadDatabaseEntries()
  }
  catch (error) {
    console.error('[sitemap] database unavailable, serving static URLs only:', error)
  }

  const entries: SitemapEntry[] = [...STATIC_ENTRIES, ...databaseEntries]

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(entry => renderEntry(siteUrl, entry)),
    '</urlset>',
  ].join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  // Rebuilt at most once an hour: crawlers poll it often and the query is heavy.
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return xml
})
