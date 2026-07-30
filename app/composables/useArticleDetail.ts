import type { ArticleDetail } from '~~/shared/types/article'
import type { MediaItem } from '~/components/article/ArticleMediaGallery.vue'

/** One step of the article breadcrumb trail. */
export interface ArticleBreadcrumb {
  title: string
  to: string
}

/**
 * Everything the article page shows, already localized and formatted.
 *
 * Components receive this object, so none of them has to know about the
 * bilingual API shape, about date formatting or about route building.
 */
export interface ArticleView {
  slug: string
  title: string
  excerpt: string
  body: string
  categoryName: string
  categorySlug: string | null
  /** Localized category page path, or null when the article has no category. */
  categoryTo: string | null
  authorName: string
  /** Localized author page path, or null when there is no linked author. */
  authorTo: string | null
  /** Machine-readable dates for <time> and for structured data. */
  publishedIso: string
  modifiedIso: string
  publishedLabel: string
  readingTimeLabel: string
  /** Raw cover, used for social cards and as the gallery fallback. */
  coverImage: string
  /** Best rendition for the on-page cover. */
  coverSrc: string
  tagNames: string[]
  media: MediaItem[]
}

interface ArticleDetailResponse {
  success: boolean
  data: ArticleDetail
}

// Articles with no cover fall back to the site logo: the only image
// guaranteed to exist in public/.
const FALLBACK_COVER = '/img/logo/dz_logo.png'

/**
 * Loads one article by slug and exposes it as a ready-to-render view model.
 *
 * Returns:
 * - `view`: the localized article, or null while loading / on error,
 * - `breadcrumbs`: Home > Articles > Category,
 * - `isLoading` / `error`: the two states the page renders instead of content.
 */
export async function useArticleDetail(articleSlug: MaybeRefOrGetter<string>) {
  const { t, locale } = useI18n()
  const localePath = useLocalePath()

  const slug = computed(() => toValue(articleSlug))
  const isFrench = computed(() => locale.value === 'fr')

  const { data, status, error } = await useFetch<ArticleDetailResponse>(
    () => `/api/articles/${slug.value}`,
    { key: () => `article-${slug.value}` },
  )

  // A deleted or mistyped slug must answer 404. Rendering a 200 page with an
  // "article not found" alert makes Google report a soft 404 instead.
  if (!data.value?.data && error.value?.statusCode === 404) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
      fatal: true,
    })
  }

  const article = computed(() => data.value?.data ?? null)
  const isLoading = computed(() => status.value === 'pending' && !article.value)

  /** Reader's language first, the other one as fallback, never undefined. */
  function pick(fr?: string | null, ar?: string | null): string {
    return (isFrench.value ? fr || ar : ar || fr) || ''
  }

  function toIso(date?: string | Date | null): string {
    return date ? new Date(date).toISOString() : ''
  }

  /** Gallery slides: the article media, or the cover as a single slide. */
  function toGallery(item: ArticleDetail): MediaItem[] {
    const fallbackAlt = pick(item.titleFr, item.titleAr)

    if (item.media?.length) {
      return item.media.map(media => ({
        type: media.type,
        src: media.url,
        publicId: media.publicId ?? undefined,
        poster: media.posterUrl ?? undefined,
        imageVariants: media.imageVariants ?? undefined,
        alt: pick(media.captionFr, media.captionAr) || fallbackAlt,
      }))
    }

    return [{
      type: 'image',
      src: item.coverImageVariants?.main || item.coverImage || FALLBACK_COVER,
      imageVariants: item.coverImageVariants ?? undefined,
      alt: fallbackAlt,
    }]
  }

  const view = computed<ArticleView | null>(() => {
    const item = article.value
    if (!item) return null

    const publishedIso = toIso(item.publishedAt || item.createdAt)
    const cover = item.coverImage || FALLBACK_COVER

    return {
      slug: item.slug,
      title: pick(item.titleFr, item.titleAr),
      excerpt: pick(item.excerptFr, item.excerptAr),
      body: pick(item.bodyFr, item.bodyAr),
      categoryName: item.category
        ? pick(item.category.nameFr, item.category.nameAr)
        : t('article.uncategorized'),
      categorySlug: item.category?.slug ?? null,
      categoryTo: item.category ? localePath(`/categories/${item.category.slug}`) : null,
      authorName: item.author
        ? pick(item.author.nameFr, item.author.nameAr)
        : t('common.siteName'),
      authorTo: item.author ? localePath(`/authors/${item.author.slug}`) : null,
      publishedIso,
      // Google shows "updated" dates when they are real: fall back to the
      // publication date when the API does not send one.
      modifiedIso: toIso(item.updatedAt) || publishedIso,
      publishedLabel: publishedIso ? formatDate(publishedIso, isFrench.value ? 'fr' : 'ar') : '',
      readingTimeLabel: `${item.readingTime || 1} ${t('article.readingTime')}`,
      coverImage: cover,
      coverSrc: item.coverImageVariants?.main || cover,
      tagNames: (item.tags ?? []).map(tag => pick(tag.nameFr, tag.nameAr)),
      media: toGallery(item),
    }
  })

  const breadcrumbs = computed<ArticleBreadcrumb[]>(() => {
    const trail: ArticleBreadcrumb[] = [
      { title: t('nav.home'), to: localePath('/') },
      { title: t('nav.articles'), to: localePath('/articles') },
    ]

    const current = view.value
    if (current?.categoryTo) {
      trail.push({ title: current.categoryName, to: current.categoryTo })
    }

    return trail
  })

  return { view, breadcrumbs, isLoading, error }
}
