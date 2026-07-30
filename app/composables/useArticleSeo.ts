import type { ArticleBreadcrumb, ArticleView } from './useArticleDetail'

const SITE_NAME = 'Guelma History'
const SITE_LOGO = '/img/logo/dz_logo.png'

/**
 * Head tags for a single article: Open Graph / Twitter cards, plus the
 * Article + BreadcrumbList structured data Google needs for rich results.
 *
 * The canonical link, the hreflang alternates and og:locale are emitted once
 * for every route by useSeoCanonical() in app.vue, so they are NOT repeated
 * here: two canonical tags on one page cancel each other out.
 */
export function useArticleSeo(options: {
  view: MaybeRefOrGetter<ArticleView | null>
  breadcrumbs: MaybeRefOrGetter<ArticleBreadcrumb[]>
}) {
  const route = useRoute()
  const config = useRuntimeConfig()
  const { locale } = useI18n()

  const view = computed(() => toValue(options.view))
  const breadcrumbs = computed(() => toValue(options.breadcrumbs))
  const siteUrl = computed(() => String(config.public.siteUrl || 'http://localhost:3000'))

  /** Crawlers and social cards only accept absolute URLs. */
  function toAbsoluteUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return siteUrl.value
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

    return new URL(pathOrUrl, siteUrl.value).toString()
  }

  // Query-free: /articles/x?ref=y must never be indexed as a second page.
  const pageUrl = computed(() => toAbsoluteUrl(route.path))
  const title = computed(() => view.value?.title || 'Article')
  const description = computed(() => view.value?.excerpt || title.value)
  const image = computed(() => toAbsoluteUrl(view.value?.coverImage || SITE_LOGO))
  const tagNames = computed(() => view.value?.tagNames ?? [])

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    author: () => view.value?.authorName || SITE_NAME,

    // "max-image-preview:large" lets Search and Discover show the cover full
    // width instead of a thumbnail, which is what drives clicks on articles.
    robots: 'index, follow, max-image-preview:large, max-snippet:-1',

    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogType: 'article',
    ogUrl: () => pageUrl.value,
    ogImage: () => image.value,
    ogImageAlt: () => title.value,
    ogSiteName: SITE_NAME,

    twitterCard: 'summary_large_image',
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
    twitterImage: () => image.value,
    twitterImageAlt: () => title.value,

    articlePublishedTime: () => view.value?.publishedIso || '',
    articleModifiedTime: () => view.value?.modifiedIso || '',
    articleSection: () => view.value?.categoryName || '',
    // article:author is a repeatable property, so it is typed as an array.
    articleAuthor: () => [view.value?.authorName || SITE_NAME],
  })

  // One JSON-LD block, two entities: the Article rich result needs absolute
  // image URLs, ISO dates and a publisher; the BreadcrumbList renders the
  // "Home > Articles > Category" trail under the search result.
  const jsonLd = computed(() => ({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${pageUrl.value}#article`,
        'headline': title.value,
        'description': description.value,
        'image': [image.value],
        'inLanguage': locale.value === 'fr' ? 'fr-FR' : 'ar-DZ',
        'datePublished': view.value?.publishedIso || '',
        'dateModified': view.value?.modifiedIso || '',
        'articleSection': view.value?.categoryName || '',
        'keywords': tagNames.value.join(', '),
        'wordCount': (view.value?.body || '').split(/\s+/).filter(Boolean).length,
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': pageUrl.value,
        },
        'author': {
          '@type': 'Person',
          'name': view.value?.authorName || SITE_NAME,
          ...(view.value?.authorTo
            ? { url: toAbsoluteUrl(view.value.authorTo) }
            : {}),
        },
        'publisher': {
          '@type': 'Organization',
          'name': SITE_NAME,
          'logo': {
            '@type': 'ImageObject',
            'url': toAbsoluteUrl(SITE_LOGO),
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl.value}#breadcrumb`,
        'itemListElement': [
          ...breadcrumbs.value.map((item, index) => ({
            '@type': 'ListItem',
            'position': index + 1,
            'name': item.title,
            'item': toAbsoluteUrl(item.to),
          })),
          // The current page closes the trail and carries no "item" URL.
          {
            '@type': 'ListItem',
            'position': breadcrumbs.value.length + 1,
            'name': title.value,
          },
        ],
      },
    ],
  }))

  useHead(() => ({
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify(jsonLd.value),
      },
    ],
    // article:tag repeats once per keyword, so each entry needs its own key or
    // the head manager would keep only the last one.
    meta: tagNames.value.map(tag => ({
      key: `article-tag-${tag}`,
      property: 'article:tag',
      content: tag,
    })),
  }))
}
