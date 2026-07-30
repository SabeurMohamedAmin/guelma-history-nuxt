<script setup lang="ts">
import type { MediaItem } from '~/components/article/ArticleMediaGallery.vue'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Renditions Cloudinary returns for every uploaded image. */
type ImageVariants = {
  thumbnail: string
  slider: string
  main: string
  original: string
}

/** Shape shared by categories, authors and tags. */
type Term = {
  id: number
  nameAr: string
  nameFr: string
  slug: string
}

type ArticleMedia = {
  type: 'image' | 'video' | 'youtube'
  url: string
  publicId?: string | null
  posterUrl?: string | null
  imageVariants?: ImageVariants | null
  captionAr?: string | null
  captionFr?: string | null
}

type ArticleDetail = {
  /** Int64 id serialized as a digit string (too big for a JS number). */
  id: string
  slug: string
  titleAr: string
  titleFr: string
  bodyAr: string
  bodyFr: string
  excerptAr?: string | null
  excerptFr?: string | null
  coverImage: string | null
  coverImageVariants?: ImageVariants | null
  media?: ArticleMedia[] | null
  publishedAt: string | Date | null
  createdAt: string | Date
  readingTime: number
  category?: Term | null
  author?: (Term & { avatar?: string | null }) | null
  tags?: Term[]
}

/* ------------------------------------------------------------------ */
/* Page setup                                                          */
/* ------------------------------------------------------------------ */

const route = useRoute()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const { locale } = useI18n()

const slug = computed(() => String(route.params.slug || ''))
const isFrench = computed(() => locale.value === 'fr')
const siteUrl = computed(() => String(config.public.siteUrl || 'http://localhost:3000'))

/** Reader's language first, the other one as fallback, never undefined. */
function pick(fr?: string | null, ar?: string | null): string {
  return (isFrench.value ? fr || ar : ar || fr) || ''
}

/** Crawlers and social cards only accept absolute URLs. */
function toAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return siteUrl.value
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  return new URL(pathOrUrl, siteUrl.value).toString()
}

/* ------------------------------------------------------------------ */
/* Page copy                                                           */
/* ------------------------------------------------------------------ */

// Every visible string lives here, so the template stays free of
// inline ternaries and new copy is edited in one single place.
const text = computed(() => isFrench.value
  ? {
      home: 'Accueil',
      articles: 'Articles',
      breadcrumb: 'Fil d’ariane',
      notFound: 'Article introuvable.',
      loading: 'Chargement de l’article…',
      defaultAuthor: 'Bily24 Team',
      defaultCategory: 'Article',
      tags: 'Mots-clés',
      sidebar: 'À découvrir aussi',
      readingTime: (minutes: number) => `${minutes} min de lecture`,
    }
  : {
      home: 'الرئيسية',
      articles: 'المقالات',
      breadcrumb: 'مسار الصفحة',
      notFound: 'تعذر العثور على المقال.',
      loading: 'جارٍ تحميل المقال…',
      defaultAuthor: 'فريق بيلي24',
      defaultCategory: 'مقال',
      tags: 'الكلمات المفتاحية',
      sidebar: 'اقرأ أيضا',
      readingTime: (minutes: number) => `${minutes} دقائق قراءة`,
    })

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const { data: response, status, error } = await useFetch<{ success: boolean, data: ArticleDetail }>(
  () => `/api/articles/${slug.value}`,
  { key: () => `article-${slug.value}` },
)

// A deleted or mistyped slug must answer 404. Rendering a 200 page with an
// "article introuvable" alert makes Google report a soft 404 instead.
if (!response.value?.data && error.value?.statusCode === 404) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Article not found',
    fatal: true,
  })
}

const article = computed(() => response.value?.data ?? null)
const isLoading = computed(() => status.value === 'pending' && !article.value)

/* ------------------------------------------------------------------ */
/* Localized content                                                   */
/* ------------------------------------------------------------------ */

const title = computed(() => pick(article.value?.titleFr, article.value?.titleAr))
const excerpt = computed(() => pick(article.value?.excerptFr, article.value?.excerptAr))
const body = computed(() => pick(article.value?.bodyFr, article.value?.bodyAr))

const category = computed(() => article.value?.category ?? null)
const author = computed(() => article.value?.author ?? null)
const tags = computed(() => article.value?.tags ?? [])

const categoryName = computed(() => (category.value
  ? pick(category.value.nameFr, category.value.nameAr)
  : text.value.defaultCategory))

const authorName = computed(() => (author.value
  ? pick(author.value.nameFr, author.value.nameAr)
  : text.value.defaultAuthor))

// Null when the article has no linked author, so the byline chip renders as
// plain text instead of a dead link.
const authorSlug = computed(() => author.value?.slug ?? null)

const tagNames = computed(() => tags.value.map(tag => pick(tag.nameFr, tag.nameAr)))

/* ------------------------------------------------------------------ */
/* Dates, cover and gallery                                            */
/* ------------------------------------------------------------------ */

// Machine-readable date for <time> and for structured data.
const publishedIso = computed(() => {
  const date = article.value?.publishedAt || article.value?.createdAt
  return date ? new Date(date).toISOString() : ''
})

const publishedDate = computed(() => (publishedIso.value
  ? formatDate(publishedIso.value, isFrench.value ? 'fr' : 'ar')
  : ''))

const readingTimeLabel = computed(() => text.value.readingTime(article.value?.readingTime || 1))

// Fallback share image for articles with no cover: the site logo is the only
// image guaranteed to exist in public/.
const coverImage = computed(() => article.value?.coverImage || '/img/logo/dz_logo.png')

// Query-free URL: /articles/x?ref=y must never be indexed as a second page.
const articleUrl = computed(() => toAbsoluteUrl(route.path))
const socialImage = computed(() => toAbsoluteUrl(coverImage.value))

// Normalize the article media into the gallery's shape, falling back to the
// cover image so there is always at least one slide.
const mediaItems = computed<MediaItem[]>(() => {
  const media = article.value?.media

  if (media?.length) {
    return media.map(item => ({
      type: item.type,
      src: item.url,
      publicId: item.publicId ?? undefined,
      poster: item.posterUrl ?? undefined,
      imageVariants: item.imageVariants ?? undefined,
      alt: pick(item.captionFr, item.captionAr) || title.value,
    }))
  }

  return [{
    type: 'image',
    src: article.value?.coverImageVariants?.main || coverImage.value,
    imageVariants: article.value?.coverImageVariants ?? undefined,
    alt: title.value,
  }]
})

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

// Feeds both the visible breadcrumb and the BreadcrumbList structured data,
// so the two can never drift apart.
const breadcrumbs = computed(() => [
  { title: text.value.home, to: localePath('/') },
  { title: text.value.articles, to: localePath('/articles') },
  ...(category.value
    ? [{ title: categoryName.value, to: localePath(`/categories/${category.value.slug}`) }]
    : []),
])

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */

// The canonical link, the hreflang alternates and og:locale are emitted once
// for every route by useSeoCanonical() in app.vue: do not repeat them here.
useSeoMeta({
  title: () => title.value || 'Article',
  description: () => excerpt.value || title.value,
  author: () => authorName.value,

  // "max-image-preview:large" lets Search and Discover show the cover full
  // width instead of a thumbnail, which is what drives clicks on articles.
  robots: 'index, follow, max-image-preview:large, max-snippet:-1',

  ogTitle: () => title.value || 'Article',
  ogDescription: () => excerpt.value || title.value,
  ogType: 'article',
  ogUrl: () => articleUrl.value,
  ogImage: () => socialImage.value,
  ogImageAlt: () => title.value || 'Article image',
  ogSiteName: 'Guelma History',

  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value || 'Article',
  twitterDescription: () => excerpt.value || title.value,
  twitterImage: () => socialImage.value,
  twitterImageAlt: () => title.value || 'Article image',

  articlePublishedTime: () => publishedIso.value,
  articleModifiedTime: () => publishedIso.value,
  articleSection: () => categoryName.value,
  articleAuthor: () => authorName.value,
})

// One JSON-LD block, two entities: the Article rich result needs absolute
// image URLs, ISO dates and a publisher; the BreadcrumbList is what renders
// the "Home > Articles > Category" trail under the search result.
const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${articleUrl.value}#article`,
      'headline': title.value,
      'description': excerpt.value || title.value,
      'image': [socialImage.value],
      'inLanguage': isFrench.value ? 'fr-FR' : 'ar-DZ',
      'datePublished': publishedIso.value,
      'dateModified': publishedIso.value,
      'articleSection': categoryName.value,
      'keywords': tagNames.value.join(', '),
      'wordCount': body.value.split(/\s+/).filter(Boolean).length,
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': articleUrl.value,
      },
      'author': {
        '@type': 'Person',
        'name': authorName.value,
        ...(authorSlug.value
          ? { url: toAbsoluteUrl(localePath(`/authors/${authorSlug.value}`)) }
          : {}),
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'Guelma History',
        'logo': {
          '@type': 'ImageObject',
          'url': toAbsoluteUrl('/img/logo/dz_logo.png'),
        },
      },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${articleUrl.value}#breadcrumb`,
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
</script>

<template>
  <div class="article-page">
    <!-- Fetch failed: say so instead of rendering an empty page. -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      role="alert"
      rounded="xl"
      :text="text.notFound"
    />

    <!-- Same shape as the real content, so nothing jumps once data lands. -->
    <v-skeleton-loader
      v-else-if="isLoading"
      type="heading, image, paragraph, paragraph"
      class="rounded-xl"
      role="status"
      :aria-label="text.loading"
    />

    <template v-else-if="article">
      <!-- Orientation for readers, internal links for crawlers. -->
      <nav :aria-label="text.breadcrumb">
        <v-breadcrumbs
          :items="breadcrumbs"
          density="compact"
          class="px-0 pt-0 text-body-2"
        >
          <template #divider>
            <v-icon
              :icon="isFrench ? 'mdi-chevron-right' : 'mdi-chevron-left'"
              size="16"
            />
          </template>
        </v-breadcrumbs>
      </nav>

      <article aria-labelledby="article-title">
        <!-- Hero: copy beside the cover on desktop, stacked on mobile. -->
        <v-sheet
          tag="header"
          rounded="xl"
          class="article-glass article-hero overflow-hidden mb-8 mb-md-10"
        >
          <v-row
            no-gutters
            align="start"
          >
            <v-col
              cols="12"
              md="6"
              class="pa-2 pa-sm-3 pa-md-4"
            >
              <div class="d-flex align-start justify-space-between ga-3 mb-4">
                <v-chip
                  :to="category ? localePath(`/categories/${category.slug}`) : undefined"
                  color="primary"
                  variant="flat"
                  size="small"
                  class="font-weight-bold"
                >
                  {{ categoryName }}
                </v-chip>

                <ArticleBookmarkButton
                  :article-slug="article.slug"
                  variant="button"
                />
              </div>

              <h1
                id="article-title"
                class="article-title text-headline-small text-sm-headline-medium font-weight-bold mb-4"
              >
                {{ title }}
              </h1>

              <p
                v-if="excerpt"
                class="article-excerpt text-body-1 text-medium-emphasis mb-6"
              >
                {{ excerpt }}
              </p>

              <!-- A list, so screen readers announce "3 items" instead of one
                   long run-on sentence. -->
              <ul class="article-meta d-flex flex-wrap ga-2 pa-0 ma-0">
                <li>
                  <v-chip
                    :to="authorSlug ? localePath(`/authors/${authorSlug}`) : undefined"
                    variant="tonal"
                    prepend-icon="mdi-account-circle-outline"
                  >
                    {{ authorName }}
                  </v-chip>
                </li>
                <li>
                  <v-chip
                    variant="tonal"
                    prepend-icon="mdi-calendar-blank-outline"
                  >
                    <time :datetime="publishedIso">{{ publishedDate }}</time>
                  </v-chip>
                </li>
                <li>
                  <v-chip
                    variant="tonal"
                    prepend-icon="mdi-clock-outline"
                  >
                    {{ readingTimeLabel }}
                  </v-chip>
                </li>
              </ul>
            </v-col>

            <v-col
              cols="12"
              md="6"
              class="pa-2 pa-sm-3"
            >
              <ArticleHero
                :image-url="article.coverImageVariants?.main || coverImage"
                :alt="title"
              />
            </v-col>
          </v-row>
        </v-sheet>

        <v-row align="start">
          <v-col
            cols="12"
            lg="8"
          >
            <v-card
              variant="flat"
              rounded="xl"
              class="article-glass"
            >
              <ArticleBody
                :body="body"
                :title="title"
                :cover-image="coverImage"
                :media="mediaItems"
              />

              <v-card-text v-if="tags.length">
                <v-divider class="mb-4" />

                <h2 class="text-overline text-medium-emphasis mb-2">
                  {{ text.tags }}
                </h2>

                <div class="d-flex flex-wrap ga-2">
                  <v-chip
                    v-for="(tag, index) in tags"
                    :key="tag.id"
                    color="primary"
                    variant="tonal"
                    size="small"
                  >
                    {{ tagNames[index] }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <ArticleEngagementPanel
              :slug="article.slug"
              :title="title"
              :excerpt="excerpt"
              class="mt-6"
            />
          </v-col>

          <!-- Sticky on the column itself: the aside would not stick inside a
               column that is only as tall as its content. -->
          <v-col
            cols="12"
            lg="4"
            class="position-sticky article-sticky"
          >
            <aside :aria-label="text.sidebar">
              <div class="article-glass article-sidebar rounded-xl pa-2">
                <layout-app-sidebar />
              </div>
            </aside>
          </v-col>
        </v-row>
      </article>

      <CommentSection
        :article-slug="article.slug"
        class="mt-8"
      />

      <ArticleRelated
        :slug="article.slug"
        :category-slug="article.category?.slug ?? null"
        class="my-6"
      />

      <NewsletterForm />
    </template>
  </div>
</template>

<style scoped>
.article-page {
  color: rgb(var(--v-theme-on-background));
}

/* Frosted panel shared by the hero, the body card and the sidebar. */
.article-glass {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: linear-gradient(
    180deg,
    rgba(var(--v-theme-surface), 0.88),
    rgba(var(--v-theme-surface), 0.72)
  );
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: box-shadow 0.28s ease;
}

.article-glass:hover {
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.06);
}

/* Declared after .article-glass so the brand tint wins over the flat
   surface gradient. */
.article-hero {
  background-image:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 36%),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 0.88),
      rgba(var(--v-theme-surface), 0.72)
    );
}

.article-title {
  line-height: 1.25;
}

/* ~68 characters is the comfortable reading width for an intro. */
.article-excerpt {
  max-width: 68ch;
  line-height: 1.85;
}

.article-meta {
  list-style: none;
}

/* Clears the fixed header when the sidebar sticks. */
.article-sticky {
  top: 80px;
}

/* Below "lg" the sidebar flows under the article, so its panel styling would
   look like a box inside a box. */
@media (max-width: 1279px) {
  .article-sidebar {
    padding: 0 !important;
    border: 0;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

/* Keyboard users must always see where they are. */
.article-page :deep(a:focus-visible),
.article-page :deep(button:focus-visible),
.article-page :deep(.v-chip:focus-visible) {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .article-page :deep(*) {
    transition: none !important;
    animation: none !important;
  }
}
</style>
