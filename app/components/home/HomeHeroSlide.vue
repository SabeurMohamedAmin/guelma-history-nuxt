<script setup lang="ts">
import type { ArticleListItem } from '~~/shared/types/article'

interface Props {
  heroArticles: ArticleListItem[]
}

const props = defineProps<Props>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

// Extract featured article (first one) and the rest (up to 3)
const featuredArticle = computed<ArticleListItem | null>(() => {
  return props.heroArticles[0] ?? null
})

const additionalArticles = computed<ArticleListItem[]>(() => {
  return props.heroArticles.slice(1, 4)
})

// Helper functions
function getTitle(article: ArticleListItem): string {
  return locale.value === 'ar' ? article.titleAr : article.titleFr
}

function getExcerpt(article: ArticleListItem): string {
  return locale.value === 'ar'
    ? (article.excerptAr ?? '')
    : (article.excerptFr ?? '')
}

function getCategoryName(article: ArticleListItem): string {
  return locale.value === 'ar'
    ? (article.categoryNameAr ?? '')
    : (article.categoryNameFr ?? '')
}

function formatDate(date: Date | string | null): string {
  if (!date) return ''

  return new Date(date).toLocaleDateString(
    locale.value === 'ar' ? 'ar-DZ' : 'fr-FR',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )
}

function getArticleLink(slug: string): string {
  return localePath(`/articles/${slug}`)
}
</script>

<template>
  <v-container
    fluid
    class="mx-0 px-0"
  >
    <v-row
      v-if="featuredArticle"
      class="align-stretch"
    >
      <!-- Featured Article (Right on Desktop, Top on Mobile) -->
      <v-col
        cols="12"
        md="7"
        order-md="2"
        class="mb-6 mb-md-0 d-flex"
      >
        <NuxtLink
          :to="getArticleLink(featuredArticle.slug)"
          class="text-decoration-none d-block w-100"
        >
          <v-card
            class="featured-card overflow-hidden h-100 d-flex flex-column"
            rounded="lg"
            variant="flat"
          >
            <div class="featured-image-wrapper position-relative d-flex justify-end">
              <!-- This is the page's LCP element. `preload` emits a
                   <link rel="preload"> in the head and fetchpriority="high"
                   tells the browser to fetch it immediately instead of
                   queuing it behind CSS/JS (the 6.7s "resource load delay"
                   Lighthouse reported). -->
              <NuxtImg
                :src="featuredArticle.coverImageVariants?.slider || featuredArticle.coverImage || '/og-default.jpg'"
                :alt="getTitle(featuredArticle)"
                contain
                class="featured-image"
                height="400"
                loading="eager"
                fetchpriority="high"
                preload
              />

              <!-- Sibling, not a child: an <img> cannot contain elements, so
                   nesting this inside <NuxtImg> silently dropped it from the
                   DOM. The wrapper is position-relative, so inset: 0 still
                   covers exactly the image area. -->
              <div class="image-gradient-overlay"></div>

              <div class="position-absolute top-0 d-flex justify-end w-100">
                <v-chip
                  v-if="getCategoryName(featuredArticle)"
                  color="surface-variant"
                  size="x-small"
                  class="my-2 py-1 align-center justify-center text-label-small text-md-body-small text-line-height-2 featured-badge"
                  variant="text"
                >
                  {{ getCategoryName(featuredArticle) }}
                </v-chip>

                <v-chip
                  color="primary"
                  size="x-small"
                  class="ma-2 py-1 align-center justify-center text-label-small text-md-body-small text-line-height-2"
                  variant="flat"
                >
                  <v-icon
                    start
                    size="x-small"
                    icon="mdi-star"
                  />
                  {{ t('home.featured') }}
                </v-chip>
              </div>
            </div>

            <div class="featured-content pa-6 pa-md-8 flex-grow-1 d-flex flex-column justify-center">
              <div class="d-flex align-center ga-2 text-caption text-disabled mb-3">
                <v-icon
                  size="small"
                  icon="mdi-calendar"
                />
                <span>{{ formatDate(featuredArticle.publishedAt) }}</span>

                <template v-if="featuredArticle.readingTime">
                  <v-divider vertical />
                  <span>{{ featuredArticle.readingTime }} {{ t('article.readingTime') }}</span>
                </template>
              </div>

              <h1 class="text-headline-medium text-md-h3 font-weight-bold mb-3 text-break">
                {{ getTitle(featuredArticle) }}
              </h1>

              <p class="text-body-1 text-medium-emphasis mb-0 d-none d-md-block">
                {{ getExcerpt(featuredArticle) }}
              </p>
            </div>
          </v-card>
        </NuxtLink>
      </v-col>

      <!-- Additional Articles (Left on Desktop, Bottom on Mobile) -->
      <v-col
        cols="12"
        md="5"
        order-md="1"
        class="d-flex"
      >
        <div class="articles-list h-100 w-100 d-flex flex-column">
          <NuxtLink
            v-for="article in additionalArticles"
            :key="article.id"
            :to="getArticleLink(article.slug)"
            class="text-decoration-none d-flex article-link"
          >
            <v-card
              class="article-card h-100 w-100"
              rounded="lg"
              variant="flat"
            >
              <v-row
                no-gutters
                class="align-stretch h-100"
              >
                <!-- Thumbnail -->
                <v-col
                  cols="4"
                  class="position-relative d-flex"
                >
                  <div class="thumbnail-wrapper w-100 h-100">
                    <!-- lazy: these small thumbnails must not compete with
                         the featured (LCP) image for bandwidth at startup. -->
                    <NuxtImg
                      :src="article.coverImageVariants?.thumbnail || article.coverImage || '/og-default.jpg'"
                      :alt="getTitle(article)"
                      cover
                      height="100%"
                      class="thumbnail-image"
                      loading="lazy"
                    />
                  </div>
                </v-col>

                <!-- Content -->
                <v-col
                  cols="8"
                  class="d-flex"
                >
                  <section class="d-flex flex-column justify-start ga-0 px-4 py-2 w-100">
                    <!-- Date -->
                    <div class="d-flex align-center ga-2 text-caption text-disabled">
                      <v-icon
                        size="x-small"
                        icon="mdi-calendar"
                      />
                      <span>{{ formatDate(article.publishedAt) }}</span>
                    </div>
                    <!-- Title -->
                    <h3 class="text-headline-small font-weight-medium my-2 text-break article-title">
                      {{ getTitle(article) }}
                    </h3>

                    <!-- Excerpt -->
                    <p class="text-body-1 text-disabled article-excerpt my-2">
                      {{ getExcerpt(article) }}
                    </p>
                    <v-chip
                      v-if="getCategoryName(article)"
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="font-weight-medium ga-1 align-self-start"
                    >
                      {{ getCategoryName(article) }}
                    </v-chip>
                  </section>
                </v-col>
              </v-row>
            </v-card>
          </NuxtLink>
        </div>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else>
      <v-col cols="12">
        <v-card
          class="text-center pa-8"
          variant="tonal"
          color="surface-variant"
          rounded="xl"
        >
          <v-icon
            size="64"
            color="disabled"
            icon="mdi-newspaper-variant-outline"
          />
          <h3 class="text-headline-small mt-4 mb-2">
            {{ t('home.noArticles') }}
          </h3>
          <p class="text-body-2 text-disabled">
            {{ t('home.noArticlesSubtitle') }}
          </p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Featured Card Styles */
.featured-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.featured-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.featured-image-wrapper {
  position: relative;
  width: 100%;
}

.featured-image {
  width: 100%;
  display: block;
  object-fit: fill;
  background: rgba(var(--v-theme-surface-variant), 0.35);
}

.image-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(var(--v-theme-surface), 0.1) 90%,
    rgba(var(--v-theme-surface), 0.95) 100%
  );
}

.featured-badge {
  backdrop-filter: blur(8px);
  background: rgba(var(--v-theme-surface), 0.3);
}

/* Articles List Styles */
.articles-list {
  gap: 16px;
}

.article-link {
  flex: 1 1 0;
  min-height: 0; /* Crucial for flex items to shrink below content size */
}

.article-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.article-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

/* Thumbnail Styles */
.thumbnail-wrapper {
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  border-radius: 8px 0 0 8px;
}

[dir="rtl"] .thumbnail-wrapper {
  border-radius: 0 8px 8px 0;
}

.thumbnail-image {
  height: 100% !important;
  width: 100%;
  display: block;
}

/* Content Styles */
.article-title {
  /* Fluid size: scales with viewport so it never overflows the card,
     while keeping the title readable. Caps at the original text-headline-small size. */
  font-size: clamp(0.95rem, 2.6vw, 1.5rem);
  line-height: 1.35;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-excerpt {
  font-size: clamp(0.8rem, 1.9vw, 1rem);
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
}

/* Responsive Adjustments */
@media (max-width: 960px) {
  /* On mobile/tablet, the layout is stacked.
     The articles-list doesn't need to match the featured card height. */
  .articles-list {
    height: auto !important;
    gap: 12px;
  }

  .article-link {
    flex: 1 1 0;
    min-height: 200px;
  }

  .thumbnail-wrapper {
    border-radius: 8px 0 0 8px;
    min-height: 140px;
  }

  [dir="rtl"] .thumbnail-wrapper {
    border-radius: 0 8px 8px 0;
  }
}

@media (max-width: 600px) {
  .article-link {
    min-height: 120px;
  }

  .thumbnail-wrapper {
    min-height: 120px;
  }

  /* Keep all details visible but compact so nothing overflows the card. */
  .article-title {
    margin-top: 4px !important;
    margin-bottom: 4px !important;
  }

  .article-excerpt {
    -webkit-line-clamp: 2;
    line-clamp: 2;
    margin-top: 0 !important;
    margin-bottom: 4px !important;
  }
}

.text-line-height-2{
  line-height: 2;
}
</style>
