<script setup lang="ts">
import type { ArticleListItem } from '~~/shared/types/article'

const props = withDefaults(defineProps<{
  articles?: ArticleListItem[]
  loading?: boolean
  interval?: number
}>(), {
  articles: () => [],
  loading: false,
  interval: 5000,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()

const isRtl = computed(() => locale.value === 'ar')

// Show at most 5 "most read" articles.
const items = computed(() => props.articles.slice(0, 5))
const hasArticles = computed(() => items.value.length > 0)

const current = ref(0)

function title(article: ArticleListItem): string {
  return locale.value === 'ar' ? article.titleAr : article.titleFr
}

function categoryName(article: ArticleListItem): string {
  return (locale.value === 'ar' ? article.categoryNameAr : article.categoryNameFr) ?? ''
}

function articleLink(slug: string): string {
  return localePath(`/articles/${slug}`)
}

function coverSrc(article: ArticleListItem): string {
  return article.coverImage || '/img/logo/dz_logo.png'
}

// RTL-aware controls: in RTL the visual "previous" goes to the next index.
function goPrev(): void {
  const len = items.value.length
  if (!len) return
  const step = isRtl.value ? 1 : -1
  current.value = (current.value + step + len) % len
}

function goNext(): void {
  const len = items.value.length
  if (!len) return
  const step = isRtl.value ? -1 : 1
  current.value = (current.value + step + len) % len
}
</script>

<template>
  <section
    v-if="hasArticles || loading"
    class="top-read mb-6"
    :aria-label="t('sidebar.topRead')"
  >
    <!-- Header: title + prev/next controls -->
    <v-divider
      color="primary"
      opacity=".2"
      thickness="3"
      gradient
      class="mb-5 hidden-md-and-up"
    />
    <div class="top-read__header d-flex align-center justify-space-between mb-5">
      <h2 class="top-read__title ma-0  text-subtitle-1 font-weight-bold d-flex align-center ga-2">
        <v-icon
          icon="mdi-fire"
          color="primary"
          size="20"
        />
        {{ t('sidebar.topRead') }}
      </h2>

      <div class="d-flex align-center ga-2">
        <v-btn
          icon
          variant="tonal"
          size="small"
          rounded="lg"
          density="comfortable"
          :aria-label="t('common.back')"
          @click="goPrev"
        >
          <v-icon
            :icon="isRtl ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            size="18"
          />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          rounded="lg"
          density="comfortable"
          :aria-label="t('article.viewMore')"
          @click="goNext"
        >
          <v-icon
            :icon="isRtl ? 'mdi-chevron-left' : 'mdi-chevron-right'"
            size="18"
          />
        </v-btn>
      </div>
    </div>

    <!-- Loading -->
    <v-skeleton-loader
      v-if="loading"
      type="image"
      class="rounded-xl"
      height="200"
    />

    <!-- Autoplaying carousel -->
    <v-carousel
      v-else
      v-model="current"
      cycle
      :interval="interval"
      height="200"
      hide-delimiter-background
      delimiter-icon="mdi-circle"
      :show-arrows="false"
      class="top-read__carousel rounded-xl"
    >
      <v-carousel-item
        v-for="(article, index) in items"
        :key="article.id"
      >
        <NuxtLink
          :to="articleLink(article.slug)"
          class="top-read__slide"
          :aria-label="title(article)"
        >
          <NuxtImg
            :src="coverSrc(article)"
            :alt="title(article)"
            cover
            height="200"
            class="top-read__image"
            :loading="'eager'"
          >
            <div class="top-read__overlay">
              <span class="top-read__rank">{{ index + 1 }}</span>

              <div class="top-read__content">
                <v-chip
                  v-if="categoryName(article)"
                  size="x-small"
                  color="primary"
                  variant="flat"
                  label
                  class="mb-2"
                >
                  {{ categoryName(article) }}
                </v-chip>
                <h3 class="top-read__slide-title">{{ title(article) }}</h3>
              </div>
            </div>
          </NuxtImg>
        </NuxtLink>
      </v-carousel-item>
    </v-carousel>
  </section>
</template>

<style scoped>
.top-read__title {
  line-height: 1.2;
}

.top-read__carousel {
  overflow: hidden;
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}

.top-read__slide {
  display: block;
  height: 100%;
  text-decoration: none;
  color: inherit;
}

.top-read__image {
  width: 100%;
  height: 100%;
}

.top-read__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 14px 16px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.85) 0%,
    rgba(0, 0, 0, 0.35) 55%,
    transparent 100%
  );
}

.top-read__rank {
  position: absolute;
  top: 10px;
  inset-inline-start: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.8125rem;
  font-weight: 800;
  color: #fff;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.top-read__content {
  width: 100%;
}

.top-read__slide-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Carousel delimiter dots: small, clear, translucent white */
.top-read__carousel :deep(.v-carousel__controls) {
  background: transparent;
  height: 28px;
}

.top-read__carousel :deep(.v-carousel__controls__item) {
  width: 18px;
  height: 18px;
  margin: 0 1px;
  color: rgba(255, 255, 255, 0.55) !important;
  opacity: 1;
}

.top-read__carousel :deep(.v-carousel__controls__item .v-icon) {
  font-size: 9px !important;
  opacity: 1;
}

.top-read__carousel :deep(.v-carousel__controls__item.v-btn--active) {
  color: rgba(255, 255, 255, 0.95) !important;
}

.top-read__carousel :deep(.v-carousel__controls__item .v-btn__overlay) {
  opacity: 0;
}
</style>
