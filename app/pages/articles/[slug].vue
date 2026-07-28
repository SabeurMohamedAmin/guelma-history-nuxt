<script setup lang="ts">
import ArticleHero from '~/components/article/ArticleHero.vue'
import ArticleBody from '~/components/article/ArticleBody.vue'
import type { MediaItem } from '~/components/article/ArticleMediaGallery.vue'
import ArticleRelated from '~/components/article/ArticleRelated.vue'
import ArticleEngagementPanel from '~/components/article/ArticleEngagementPanel.vue'
import NewsletterForm from '~/components/newsletter/NewsletterForm.vue'

type ArticleDetail = {
  // Int64 id serialized as a digit string (too big for a JS number).
  id: string
  titleAr: string
  titleFr: string
  slug: string
  body: string
  excerptAr?: string | null
  excerptFr?: string | null
  coverImage: string | null
  media?: Array<{
    type: 'image' | 'video' | 'youtube'
    url: string
    publicId?: string | null
    posterUrl?: string | null
    captionAr?: string | null
    captionFr?: string | null
  }> | null
  publishedAt: string | Date | null
  createdAt: string | Date
  readingTime: number
  category?: {
    id: number
    nameAr: string
    nameFr: string
    slug: string
  } | null
  author?: {
    id: number
    nameAr: string
    nameFr: string
    slug: string
    avatar?: string | null
  } | null
  tags?: Array<{
    id: number
    nameAr: string
    nameFr: string
    slug: string
  }>
}

const route = useRoute()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const { locale } = useI18n()

const slug = computed(() => String(route.params.slug || ''))
const isFrench = computed(() => locale.value === 'fr')
const siteUrl = computed(() => String(config.public.siteUrl || 'http://localhost:3000'))

const buildAbsoluteUrl = (pathOrUrl: string) => {
  if (!pathOrUrl) return siteUrl.value
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl

  return new URL(pathOrUrl, siteUrl.value).toString()
}

const { data: response, pending, error } = await useFetch<{ success: boolean, data: ArticleDetail }>(
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

const title = computed(() => {
  if (!article.value) return ''
  return isFrench.value ? article.value.titleFr || article.value.titleAr : article.value.titleAr || article.value.titleFr
})

const excerpt = computed(() => {
  if (!article.value) return ''
  return isFrench.value
    ? article.value.excerptFr || article.value.excerptAr || ''
    : article.value.excerptAr || article.value.excerptFr || ''
})

const categoryName = computed(() => {
  const category = article.value?.category
  if (!category) return isFrench.value ? 'Article' : 'مقال'
  return isFrench.value ? category.nameFr || category.nameAr : category.nameAr || category.nameFr
})

const authorName = computed(() => {
  const author = article.value?.author
  if (!author) return isFrench.value ? 'Bily24 Team' : 'فريق بيلي24'
  return isFrench.value ? author.nameFr || author.nameAr : author.nameAr || author.nameFr
})

// Link target for the byline. Null when the article has no linked author, so
// the template falls back to plain text instead of a dead link.
const authorSlug = computed(() => article.value?.author?.slug ?? null)

const publishedDate = computed(() => {
  const date = article.value?.publishedAt || article.value?.createdAt
  if (!date) return ''

  return new Intl.DateTimeFormat(isFrench.value ? 'fr-FR' : 'ar-DZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
})

const readingTimeLabel = computed(() => {
  const minutes = article.value?.readingTime || 1
  return isFrench.value ? `${minutes} min de lecture` : `${minutes} دقائق قراءة`
})

// Fallback share image for articles with no cover. Uses the site logo, which
// is the only image guaranteed to exist in public/.
const coverImage = computed(() => article.value?.coverImage || '/img/logo/dz_logo.png')
const articleUrl = computed(() => buildAbsoluteUrl(route.fullPath))
const socialImage = computed(() => buildAbsoluteUrl(coverImage.value))
const tags = computed(() => article.value?.tags ?? [])
const publishedIsoDate = computed(() => {
  const date = article.value?.publishedAt || article.value?.createdAt
  return date ? new Date(date).toISOString() : ''
})

const tagNames = computed(() => tags.value.map((tag) => {
  return isFrench.value ? tag.nameFr || tag.nameAr : tag.nameAr || tag.nameFr
}))

// Normalize the article media into the gallery's shape. When the article has a
// media array we use it; otherwise we fall back to the single cover image so
// the content gallery always has at least one slide to show.
const mediaItems = computed<MediaItem[]>(() => {
  const media = article.value?.media
  if (media?.length) {
    return media.map((item) => {
      const caption = isFrench.value
        ? item.captionFr || item.captionAr
        : item.captionAr || item.captionFr
      return {
        type: item.type,
        src: item.url,
        publicId: item.publicId ?? undefined,
        poster: item.posterUrl ?? undefined,
        alt: caption || title.value,
      }
    })
  }
  return [{ type: 'image', src: coverImage.value, alt: title.value }]
})

useSeoMeta({
  title: () => title.value || 'Article',
  description: () => excerpt.value || title.value,
  author: () => authorName.value,
  ogTitle: () => title.value || 'Article',
  ogDescription: () => excerpt.value || title.value,
  ogType: 'article',
  ogUrl: () => articleUrl.value,
  ogImage: () => socialImage.value,
  ogImageAlt: () => title.value || 'Article image',
  ogSiteName: 'Guelma History',
  ogLocale: () => isFrench.value ? 'fr_FR' : 'ar_DZ',
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value || 'Article',
  twitterDescription: () => excerpt.value || title.value,
  twitterImage: () => socialImage.value,
  twitterImageAlt: () => title.value || 'Article image',
})

// Structured data. Google uses this for article rich results: it needs an
// absolute image URL, ISO dates and a publisher block to be eligible.
const articleJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  'headline': title.value,
  'description': excerpt.value || title.value,
  'image': [socialImage.value],
  'inLanguage': isFrench.value ? 'fr-FR' : 'ar-DZ',
  'datePublished': publishedIsoDate.value,
  'dateModified': publishedIsoDate.value,
  'articleSection': categoryName.value,
  'keywords': tagNames.value.join(', '),
  'mainEntityOfPage': {
    '@type': 'WebPage',
    '@id': articleUrl.value,
  },
  'author': {
    '@type': 'Person',
    'name': authorName.value,
    ...(authorSlug.value
      ? { url: buildAbsoluteUrl(localePath(`/authors/${authorSlug.value}`)) }
      : {}),
  },
  'publisher': {
    '@type': 'Organization',
    'name': 'Guelma History',
    'logo': {
      '@type': 'ImageObject',
      'url': buildAbsoluteUrl('/img/logo/dz_logo.png'),
    },
  },
}))

useHead(() => ({
  link: [
    {
      rel: 'canonical',
      href: articleUrl.value,
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(articleJsonLd.value),
    },
  ],
  meta: [
    {
      property: 'article:published_time',
      content: publishedIsoDate.value,
    },
    {
      property: 'article:author',
      content: authorName.value,
    },
    {
      property: 'article:section',
      content: categoryName.value,
    },
    ...tagNames.value.map(tagName => ({
      property: 'article:tag',
      content: tagName,
    })),
  ],
}))
</script>

<template>
  <div class="article-page">
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="rounded-xl"
    >
      {{ isFrench ? 'Article introuvable.' : 'تعذر العثور على المقال.' }}
    </v-alert>

    <v-skeleton-loader
      v-else-if="pending && !article"
      type="heading, image, paragraph, paragraph"
      class="rounded-xl"
    />

    <template v-else-if="article">
      <nav
        class="article-breadcrumb mb-4"
        :aria-label="isFrench ? 'Fil d’ariane' : 'مسار الصفحة'"
      >
        <NuxtLink :to="localePath('/')">
          {{ isFrench ? 'Accueil' : 'الرئيسية' }}
        </NuxtLink>
        <v-icon
          icon="mdi-chevron-right"
          size="18"
        />
        <NuxtLink :to="localePath('/articles')">
          {{ isFrench ? 'Articles' : 'المقالات' }}
        </NuxtLink>
        <v-icon
          icon="mdi-chevron-right"
          size="18"
        />
        <span>{{ categoryName }}</span>
      </nav>

      <!-- Hero: two-column on desktop, header-first stacked on small screens -->
      <section class="article-hero-card article-surface mb-8 mb-md-10 pa-2">
        <div class="article-hero-copy">
          <div class="article-hero-top mt-1">
            <v-chip
              color="primary"
              variant="flat"
              size="small"
              class="font-weight-bold article-chip"
            >
              {{ categoryName }}
            </v-chip>

            <ArticleBookmarkButton
              :article-slug="article.slug"
              variant="button"
            />
          </div>

          <h1 class="article-title mb-5 text-headline-small text-sm-headline-medium">
            {{ title }}
          </h1>

          <p
            v-if="excerpt"
            class="article-excerpt mb-6"
          >
            {{ excerpt }}
          </p>

          <div class="d-flex flex-wrap ga-2">
            <NuxtLink
              v-if="authorSlug"
              :to="localePath(`/authors/${authorSlug}`)"
              class="meta-item meta-item--link"
            >
              <v-icon
                icon="mdi-account-circle-outline"
                size="20"
              />
              {{ authorName }}
              <v-icon
                :icon="isFrench ? 'mdi-arrow-right' : 'mdi-arrow-left'"
                size="18"
              />
            </NuxtLink>
            <span
              v-else
              class="meta-item"
            >
              <v-icon
                icon="mdi-account-circle-outline"
                size="20"
              />
              {{ authorName }}
            </span>
            <span class="meta-item">
              <v-icon
                icon="mdi-calendar-blank-outline"
                size="20"
              />
              {{ publishedDate }}
            </span>
            <span class="meta-item">
              <v-icon
                icon="mdi-clock-outline"
                size="20"
              />
              {{ readingTimeLabel }}
            </span>
          </div>
        </div>

        <div class="article-hero-media">
          <ArticleHero
            :image-url="coverImage"
            :alt="title"
          />
        </div>
      </section>

      <v-row
        align="start"
        class="article-layout"
        style="row-gap: 24px;"
      >
        <v-col
          cols="12"
          lg="8"
        >
          <v-card
            class="article-content-card article-surface rounded-xl"
            variant="flat"
          >
            <ArticleBody
              :body="article.body"
              :title="title"
              :cover-image="coverImage"
              :media="mediaItems"
            />

            <div
              v-if="tags.length"
              class="article-tags"
            >
              <v-chip
                v-for="tag in tags"
                :key="tag.id"
                variant="tonal"
                color="primary"
                size="small"
                class="article-tag-chip"
              >
                {{ isFrench ? tag.nameFr || tag.nameAr : tag.nameAr || tag.nameFr }}
              </v-chip>
            </div>
          </v-card>

          <ArticleEngagementPanel
            :slug="article.slug"
            :title="title"
            :excerpt="excerpt"
            class="mt-6"
          />
        </v-col>

        <v-col
          cols="12"
          lg="4"
          class="position-sticky sticky-detail"
        >
          <aside class="article-sidebar">
            <div class="article-sidebar-inner article-surface pa-2 rounded-xl">
              <layout-app-sidebar />
            </div>
          </aside>
        </v-col>
      </v-row>

      <CommentSection :article-slug="article.slug" />

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

.article-page :deep(a),
.article-page :deep(button),
.article-page :deep(.v-chip),
.article-page :deep(.v-card) {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.25s ease,
    border-color 0.25s ease,
    color 0.2s ease;
}

.article-surface {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background:
    linear-gradient(180deg,
      rgba(var(--v-theme-surface), 0.88),
      rgba(var(--v-theme-surface), 0.72)
    );
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.04),
    0 2px 10px rgba(0, 0, 0, 0.03);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.article-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.92rem;
}

.article-breadcrumb a {
  color: inherit;
  text-decoration: none;
  transition: color 0.22s ease, opacity 0.22s ease;
}

.article-breadcrumb a:hover {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}

/* Desktop hero: copy on the left, media on the right. */
.article-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(320px, 1.08fr);
  gap: clamp(1.5rem, 3vw, 2.75rem);
  align-items: start;
  border-radius: 32px;
  overflow: hidden;
  position: relative;
  isolation: isolate;
}

.article-hero-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 36%),
    radial-gradient(circle at bottom right, rgba(var(--v-theme-primary), 0.06), transparent 32%);
  pointer-events: none;
  z-index: -1;
}

.article-hero-copy {
  position: relative;
  z-index: 1;
}

/* Category chip on the start, save button facing it on the end. */
.article-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.article-hero-media {
  border-radius: 24px;
  overflow: hidden;
  transform: translateZ(0);

}

.article-hero-media :deep(img),
.article-hero-media :deep(video),
.article-hero-media :deep(.v-img__img) {
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.article-hero-card:hover .article-hero-media :deep(img),
.article-hero-card:hover .article-hero-media :deep(video),
.article-hero-card:hover .article-hero-media :deep(.v-img__img) {
  transform: scale(1.02);
}

.article-chip {
  box-shadow: 0 8px 20px rgba(var(--v-theme-primary), 0.16);
}

.article-title {
  max-width: 780px;
}

.article-excerpt {
  max-width: 68ch;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: clamp(1.02rem, 1.5vw, 1.18rem);
  line-height: 1.85;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.62rem 0.9rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 999px;
  background: rgba(var(--v-theme-surface), 0.62);
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.92rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.meta-item:hover {
  background: rgba(var(--v-theme-surface), 0.82);
  border-color: rgba(var(--v-theme-primary), 0.16);
}

/* The author byline is a link: keep it visually identical but interactive. */
.meta-item--link {
  text-decoration: none;
  color: rgba(var(--v-theme-on-surface), 0.78);
  cursor: pointer;
}

.meta-item--link:hover {
  color: rgb(var(--v-theme-primary));
}

.article-layout {
  align-items: flex-start;
}

.article-content-card {
  border-radius: 28px !important;
}

.article-content-card:hover {
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.05),
    0 6px 20px rgba(0, 0, 0, 0.04);
}

.article-sidebar {

}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.article-tag-chip:hover {
  transform: translateY(-1px);
}

.article-page :deep(.v-divider) {
  opacity: 0.65;
}

.sticky-detail{
  top: 80px;
}

@media (max-width: 1279px) {
  .article-title {
    max-width: 100%;
  }
}

@media (max-width: 959px) {
  /* Small screens: stack header first (smaller), image below it. */
  .article-hero-card {
    grid-template-columns: 1fr;
    border-radius: 24px;
  }

  .article-hero-media {
    order: 1;
    border-radius: 20px;

  }

  .article-title {
    line-height: 1.18;
  }

  .article-excerpt {
    font-size: 0.98rem;
    line-height: 1.75;
  }

  .article-content-card {
    border-radius: 22px !important;
  }

  .article-sidebar-inner {
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .article-page :deep(a),
  .article-page :deep(button),
  .article-page :deep(.v-chip),
  .article-page :deep(.v-card),
  .article-hero-media :deep(img),
  .article-hero-media :deep(video),
  .article-hero-media :deep(.v-img__img),
  .meta-item {
    transition: none !important;
    transform: none !important;
  }
}
</style>
