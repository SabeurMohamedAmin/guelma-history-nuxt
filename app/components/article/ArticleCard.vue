<script setup lang="ts">
const { locale, t } = useI18n()
const localePath = useLocalePath()

const props = defineProps<{
  article: {
    // Database identifiers are UUID strings throughout article payloads.
    id: string
    titleAr: string
    titleFr: string
    slug: string
    coverImage: string | null
    publishedAt: Date | string | null
    readingTime: number
    commentCount?: number
    categoryNameAr?: string | null
    categoryNameFr?: string | null
    authorNameAr?: string | null
    authorNameFr?: string | null
    excerptAr?: string | null
    excerptFr?: string | null
  }
  variant?: 'horizontal' | 'vertical' | 'featured'
  /**
   * Marks this card as the page's first, above-the-fold card (the likely
   * LCP element). Its image then loads eagerly with high fetch priority
   * and a head preload instead of lazily. Leave unset for all other cards.
   */
  priority?: boolean
}>()

const cardVariant = computed(() => props.variant ?? 'horizontal')

// Image loading strategy derived from `priority` (see the prop docs above).
const imgLoading = computed(() => (props.priority ? 'eager' : 'lazy'))
const imgFetchPriority = computed(() => (props.priority ? 'high' : undefined))

const title = computed(() =>
  locale.value === 'ar' ? props.article.titleAr : props.article.titleFr,
)

const excerpt = computed(() =>
  locale.value === 'ar'
    ? (props.article.excerptAr ?? '')
    : (props.article.excerptFr ?? ''),
)

const categoryName = computed(() =>
  locale.value === 'ar' ? props.article.categoryNameAr : props.article.categoryNameFr,
)

const authorName = computed(() =>
  locale.value === 'ar' ? props.article.authorNameAr : props.article.authorNameFr,
)

const formattedDate = computed(() => {
  if (!props.article.publishedAt) return ''
  return new Date(props.article.publishedAt).toLocaleDateString(
    locale.value === 'ar' ? 'ar-DZ' : 'fr-FR',
    { year: 'numeric', month: 'long', day: 'numeric' },
  )
})

const commentCount = computed(() => props.article.commentCount ?? 0)

const coverSrc = computed(() => props.article.coverImage || '/og-default.jpg')
</script>

<template>
  <v-card
    :to="localePath(`/articles/${article.slug}`)"
    class="article-card"
    :class="`article-card--${cardVariant}`"
    flat
    rounded="xl"
  >
    <!-- HORIZONTAL (compact row) -->
    <template v-if="cardVariant === 'horizontal'">
      <div class="article-card__h-layout">
        <div class="article-card__h-image-wrap">
          <NuxtImg
            :src="coverSrc"
            :alt="title"
            width="200"
            height="140"
            :loading="imgLoading"
            :fetchpriority="imgFetchPriority"
            :preload="priority"
            fit="cover"
            class="article-card__h-image"
          />
          <v-chip
            v-if="categoryName"
            size="x-small"
            variant="text"
            label
            class="article-card__category-badge text-label-small text-md-body-small py-0"
          >
            {{ categoryName }}
          </v-chip>
          <div class="article-card__bookmark">
            <ArticleBookmarkButton :article-slug="article.slug" />
          </div>
        </div>

        <div class="article-card__h-content">
          <h3 class="article-card__title text-subtitle-2 font-weight-bold my-1">
            {{ title }}
          </h3>

          <p class="article-card__excerpt article-card__excerpt--compact text-body-2 text-medium-emphasis">
            {{ excerpt }}
          </p>

          <div class="article-card__meta">
            <time
              v-if="formattedDate"
              :datetime="String(article.publishedAt)"
              class="article-card__meta-item"
            >
              <v-icon
                icon="mdi-calendar-outline"
                size="13"
              />
              {{ formattedDate }}
            </time>

            <span
              v-if="authorName"
              class="article-card__meta-item"
            >
              <v-icon
                icon="mdi-account-outline"
                size="13"
              />
              {{ authorName }}
            </span>

            <span class="article-card__meta-item">
              <v-icon
                icon="mdi-clock-outline"
                size="13"
              />
              {{ article.readingTime }} {{ t('article.min') }}
            </span>

            <span class="article-card__meta-item">
              <v-icon
                icon="mdi-comment-outline"
                size="13"
              />
              {{ commentCount }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- VERTICAL (borderless native grid card) -->
    <template v-else-if="cardVariant === 'vertical'">
      <div class="article-card__v-image-wrap rounded-lg">
        <NuxtImg
          :src="coverSrc"
          :alt="title"
          width="400"
          height="220"
          :loading="imgLoading"
          :fetchpriority="imgFetchPriority"
          :preload="priority"
          fit="cover"
          class="article-card__v-image"
        />
        <v-chip
          v-if="categoryName"
          size="x-small"
          color="primary"
          variant="flat"
          label
          class="article-card__category-badge text-caption text-sm-label-small text-md-body-small py-0 start-0"
        >
          {{ categoryName }}
        </v-chip>
        <div class="article-card__bookmark">
          <ArticleBookmarkButton :article-slug="article.slug" />
        </div>
      </div>

      <div class="article-card__v-content pa-1">
        <h3 class="article-card__title text-subtitle-1 font-weight-bold my-1">
          {{ title }}
        </h3>

        <p class="article-card__excerpt text-body-2 text-medium-emphasis mb-2">
          {{ excerpt }}
        </p>

        <div class="article-card__meta">
          <time
            v-if="formattedDate"
            :datetime="String(article.publishedAt)"
            class="article-card__meta-item"
          >
            <v-icon
              icon="mdi-calendar-outline"
              size="13"
            />
            {{ formattedDate }}
          </time>

          <span
            v-if="authorName"
            class="article-card__meta-item"
          >
            <v-icon
              icon="mdi-account-outline"
              size="13"
            />
            {{ authorName }}
          </span>

          <span class="article-card__meta-item">
            <v-icon
              icon="mdi-clock-outline"
              size="13"
            />
            {{ article.readingTime }} {{ t('article.min') }}
          </span>

          <span class="article-card__meta-item">
            <v-icon
              icon="mdi-comment-outline"
              size="13"
            />
            {{ commentCount }}
          </span>
        </div>
      </div>
    </template>

    <!-- FEATURED -->
    <template v-else>
      <div class="article-card__f-wrapper">
        <NuxtImg
          :src="coverSrc"
          :alt="title"
          width="900"
          height="480"
          loading="eager"
          fit="cover"
          class="article-card__f-image"
        />

        <div class="article-card__f-overlay">
          <div class="article-card__f-content">
            <v-chip
              v-if="categoryName"
              size="small"
              color="primary"
              variant="flat"
              label
              class="mb-3"
            >
              {{ categoryName }}
            </v-chip>

            <h2 class="article-card__f-title">
              {{ title }}
            </h2>

            <div class="article-card__meta article-card__meta--light mt-3">
              <time
                v-if="formattedDate"
                :datetime="String(article.publishedAt)"
                class="article-card__meta-item"
              >
                <v-icon
                  icon="mdi-calendar-outline"
                  size="13"
                />
                {{ formattedDate }}
              </time>

              <span
                v-if="authorName"
                class="article-card__meta-item"
              >
                <v-icon
                  icon="mdi-account-outline"
                  size="13"
                />
                {{ authorName }}
              </span>

              <span class="article-card__meta-item">
                <v-icon
                  icon="mdi-clock-outline"
                  size="13"
                />
                {{ article.readingTime }} {{ t('article.min') }}
              </span>

              <span class="article-card__meta-item">
                <v-icon
                  icon="mdi-comment-outline"
                  size="13"
                />
                {{ commentCount }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </v-card>
</template>

<style scoped>
/* ─── Base ─── */
.article-card {
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
}

.article-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3);
}

/* The grid (vertical) card is borderless & native: no chrome until hovered. */
.article-card--vertical {
  border: 1px solid transparent;
  background: transparent;
}

.article-card--vertical:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px);
}

.article-card:hover .article-card__h-image,
.article-card:hover .article-card__v-image,
.article-card:hover .article-card__f-image {
  transform: scale(1.01);
}

@media (prefers-reduced-motion: reduce) {
  .article-card,
  .article-card__h-image,
  .article-card__v-image,
  .article-card__f-image {
    transition: none;
  }

  .article-card:hover {
    transform: none;
  }

  .article-card:hover .article-card__h-image,
  .article-card:hover .article-card__v-image,
  .article-card:hover .article-card__f-image {
    transform: none;
  }
}

/* ─── Category badge (shared, positioned over image) ─── */
.article-card__category-badge {
  position: absolute;
  top: 10px;
  inset-inline-start: 5px; /* RTL-aware */
  -webkit-backdrop-filter: blur(15px) brightness(.7);
  backdrop-filter: blur(15px) brightness(.7);
  background-color: rgba(var(--v-theme-surface) , .15);

}

/* ─── Bookmark toggle (over image, opposite the category badge) ─── */
.article-card__bookmark {
  position: absolute;
  top: 6px;
  inset-inline-end: 6px;
  background: rgba(var(--v-theme-surface), 0.85);
  border-radius: 999px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ─── Meta row (shared) ─── */
.article-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: auto;
}

.article-card__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
  line-height: 1;
}

.article-card__meta--light .article-card__meta-item {
  color: rgba(255, 255, 255, 0.75);
}

/* ─── Title & excerpt (shared) ─── */
.article-card__title {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__excerpt {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.55;
  margin-bottom: 0;
}

.article-card__excerpt--compact {
  -webkit-line-clamp: 1;
  line-clamp: 1;
}

/* ─── HORIZONTAL (compact row) ─── */
.article-card__h-layout {
  display: flex;
  flex-direction: row;
  height: 100%;
}

.article-card__h-image-wrap {
  position: relative;
  flex: 0 0 170px;
  overflow: hidden;
}

.article-card__h-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.article-card__h-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  min-width: 0;
}

@media (max-width: 600px) {
  .article-card__h-layout {
    flex-direction: column;
  }

  .article-card__h-image-wrap {
    flex: 0 0 170px;
    width: 100%;
  }
}

/* ─── VERTICAL (grid) ─── */
.article-card__v-image-wrap {
  position: relative;
  overflow: hidden;
  line-height: 0;
}

.article-card__v-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.article-card__v-content {
  display: flex;
  flex-direction: column;
}

/* ─── FEATURED ─── */
.article-card__f-wrapper {
  position: relative;
  line-height: 0;
}

.article-card__f-image {
  width: 100%;
  height: 420px;
  object-fit: cover;
  display: block;
  transition: transform 0.5s ease;
}

@media (max-width: 600px) {
  .article-card__f-image {
    height: 300px;
  }
}

.article-card__f-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
  border-radius: inherit;
  display: flex;
  align-items: flex-end;
}

.article-card__f-content {
  padding: 24px 28px;
  width: 100%;
}

.article-card__f-title {
  font-size: clamp(1.15rem, 2.5vw, 1.6rem);
  font-weight: 700;
  line-height: 1.3;
  color: #fff;
  text-wrap: balance;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
