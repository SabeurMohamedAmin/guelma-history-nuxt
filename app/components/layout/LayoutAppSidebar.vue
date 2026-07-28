LayoutAppSidebar.vue

<script setup lang="ts">
import type { ArticleListItem } from '~~/shared/types/article'
import { formatDate } from '~/utils/date'

const props = withDefaults(defineProps<{
  recentArticles?: ArticleListItem[]
  loading?: boolean
}>(), {
  recentArticles: () => [],
  loading: false,
})

const { t, locale } = useI18n()
const localePath = useLocalePath()

const hasArticles = computed(() => props.recentArticles.length > 0)

const adSlots = useRuntimeConfig().public.adsenseSlots

function title(article: ArticleListItem): string {
  return locale.value === 'ar' ? article.titleAr : article.titleFr
}

function date(article: ArticleListItem): string {
  return article.publishedAt
    ? formatDate(article.publishedAt, locale.value as 'ar' | 'fr')
    : ''
}
</script>

<template>
  <aside
    class="position-sticky"
    style="top: 65px;"
  >
    <LayoutTopReadArticles
      :articles="recentArticles"
      :loading="loading"
    />
    <v-card
      color="surface"
      variant="flat"
      class="rounded-xl pa-4 mb-6 border"
    >
      <h2
        id="recent-articles-heading"
        class="text-headline-small font-weight-bold pa-2 ma-0 mb-4"
      >
        {{ t('sidebar.recentArticles') }}
      </h2>

      <!-- Loading skeleton -->
      <div
        v-if="loading"
        class="d-flex flex-column ga-2"
      >
        <v-skeleton-loader
          v-for="n in 3"
          :key="n"
          type="list-item-avatar-two-line"
          class="rounded-lg"
        />
      </div>

      <!-- Articles -->
      <nav
        v-else-if="hasArticles"
        :aria-labelledby="'recent-articles-heading'"
        class="recent-list"
      >
        <NuxtLink
          v-for="article in recentArticles"
          :key="article.id"
          :to="localePath(`/articles/${article.slug}`)"
          class="recent-item"
        >
          <v-avatar
            size="56"
            rounded="lg"
            color="surface-variant"
            class="recent-item__thumb"
          >
            <NuxtImg
              v-if="article.coverImage"
              :src="article.coverImage"
              :alt="title(article)"
              loading="lazy"
              cover
            />
            <v-icon
              v-else
              icon="mdi-image-outline"
              color="medium-emphasis"
              size="20"
            />
          </v-avatar>

          <div class="recent-item__body">
            <h3 class="recent-item__title">
              {{ title(article) }}
            </h3>
            <time
              v-if="date(article)"
              class="recent-item__date"
            >
              <v-icon
                icon="mdi-calendar-blank-outline"
                size="12"
              />
              {{ date(article) }}
            </time>
          </div>
        </NuxtLink>
      </nav>

      <!-- Empty state -->
      <div
        v-else
        class="text-center text-medium-emphasis py-6"
      >
        <v-icon
          icon="mdi-newspaper-variant-outline"
          size="32"
          class="mb-2"
        />
        <p class="text-body-2 mb-0">
          {{ t('common.noResults') }}
        </p>
      </div>
    </v-card>
    <LayoutRecentComments />

    <v-card
      color="surface"
      variant="flat"
      class="rounded-xl mb-6 border social-card overflow-hidden"
    >
      <div class="social-card__cover">
        <v-icon
          icon="mdi-map-marker-radius-outline"
          size="28"
          class="social-card__cover-icon"
        />
      </div>

      <div class="social-card__content px-5 pb-5 text-center">
        <v-avatar
          size="78"
          class="social-card__avatar mb-3"
        >
          <NuxtImg
            src="/img/logo/dz_logo.png"
            alt="Guelma History"
          />
        </v-avatar>

        <h4 class="text-subtitle-2 text-medium-emphasis mb-1">
          {{ t('sidebar.followUs') }}
        </h4>
        <h3 class="text-headline-small font-weight-bold mb-1">
          Guelma History
        </h3>
        <p class="text-caption text-primary font-weight-medium mb-4">
          @GuelmaHistory
        </p>

        <p class="text-body-2 text-medium-emphasis mb-5 social-card__description">
          {{ t('sidebar.socialDescription') }}
        </p>

        <v-btn
          block
          color="primary"
          variant="flat"
          prepend-icon="mdi-facebook"
          href="https://www.facebook.com/GuelmaHistory"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-lg mb-3 text-none"
          :aria-label="t('sidebar.followFacebook')"
        >
          {{ t('sidebar.followFacebook') }}
        </v-btn>

        <div class="d-flex align-center justify-center gap-2">
          <v-btn
            icon="mdi-instagram"
            variant="tonal"
            size="small"
            color="primary"
            href="https://www.instagram.com/GuelmaHistory"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          />
          <v-btn
            icon="mdi-youtube"
            variant="tonal"
            size="small"
            color="primary"
            href="https://www.youtube.com/@GuelmaHistory"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
          />
          <v-btn
            icon="mdi-link-variant"
            variant="tonal"
            size="small"
            color="primary"
            :to="localePath('/about')"
            aria-label="About Guelma History"
          />
        </div>
      </div>
    </v-card>

    <AdUnit
      :ad-slot="adSlots.sidebar"
      :min-height="280"
      class="mb-6"
    />
  </aside>
</template>

<style scoped>
.border { border: 1px solid rgb(var(--v-border-color) / 0.12); }
.gap-2 { gap: 0.5rem; }
.bg-gradient {
  background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
}

.social-card__cover {
  position: relative;
  height: 92px;
  background:
    radial-gradient(circle at 20% 20%, rgb(var(--v-theme-primary) / 0.32), transparent 32%),
    linear-gradient(135deg, rgb(var(--v-theme-primary) / 0.22), rgb(var(--v-theme-surface-variant)));
}

.social-card__cover::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(135deg, rgb(var(--v-theme-primary) / 0.16) 25%, transparent 25%, transparent 50%, rgb(var(--v-theme-primary) / 0.1) 50%, rgb(var(--v-theme-primary) / 0.1) 75%, transparent 75%);
  background-size: 28px 28px;
  opacity: 0.35;
}

.social-card__cover-icon {
  position: absolute;
  inset-inline-end: 16px;
  bottom: 14px;
  color: rgb(var(--v-theme-primary));
  opacity: 0.75;
  z-index: 1;
}

.social-card__content {
  margin-top: -38px;
  position: relative;
  z-index: 1;
}

.social-card__avatar {
  border: 4px solid rgb(var(--v-theme-surface));
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.14);
  background-color: rgb(var(--v-theme-surface));
}

.social-card__description {
  line-height: 1.7;
}

/* Recent articles: compact, balanced rows */
.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: background-color 0.18s ease;
}

.recent-item + .recent-item {
  margin-top: 2px;
}

/* Thin accent bar on hover instead of a large filled block */
.recent-item::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  transform-origin: center;
  width: 3px;
  height: 60%;
  border-radius: 3px;
  background-color: rgb(var(--v-theme-primary));
  transition: transform 0.18s ease;
}

.recent-item:hover {
  background-color: rgb(var(--v-theme-primary) / 0.05);
}

.recent-item:hover::before {
  transform: translateY(-50%) scaleY(1);
}

.recent-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.recent-item__thumb {
  flex: 0 0 auto;
}

.recent-item__body {
  min-width: 0;
  flex: 1 1 auto;
}

/* Title: clamp to 2 lines for a tidy, consistent layout */
.recent-item__title {
  margin: 0 0 4px;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.18s ease;
}

.recent-item:hover .recent-item__title {
  color: rgb(var(--v-theme-primary));
}

.recent-item__date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-primary));
}

@media (prefers-reduced-motion: reduce) {
  .recent-item,
  .recent-item::before,
  .recent-item__title { transition: none; }
}
</style>
