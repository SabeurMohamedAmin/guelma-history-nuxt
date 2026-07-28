<script setup lang="ts">
/**
 * The current user's reading list (saved articles).
 *
 * Auth-gated page: the API returns 401 for guests, and the menu entry is only
 * shown when logged in. Lists saved articles newest-first with a remove action
 * and a friendly empty state.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const bookmarks = useBookmarksStore()

useSeoMeta({
  title: () => t('bookmarks.readingList'),
})

await useAsyncData('reading-list', () => bookmarks.load())

const isFrench = computed(() => locale.value === 'fr')

function title(item: { titleAr: string, titleFr: string }) {
  return isFrench.value ? item.titleFr : item.titleAr
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(isFrench.value ? 'fr-FR' : 'ar-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function onRemove(articleSlug: string) {
  await bookmarks.remove(articleSlug)
}
</script>

<template>
  <v-container class="py-6">
    <!-- Header -->
    <div class="d-flex align-center ga-3 mb-6">
      <v-icon
        icon="mdi-bookmark-multiple-outline"
        size="32"
        color="primary"
      />
      <div>
        <h1 class="text-h5 text-sm-h4 font-weight-bold">
          {{ t('bookmarks.readingList') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('bookmarks.count', { count: bookmarks.count }) }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="bookmarks.pending && bookmarks.items.length === 0"
      class="d-flex justify-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <!-- Empty state -->
    <v-sheet
      v-else-if="bookmarks.items.length === 0"
      rounded="xl"
      class="empty-state pa-10 text-center"
    >
      <v-icon
        icon="mdi-bookmark-outline"
        size="56"
        class="mb-4 text-medium-emphasis"
      />
      <h2 class="text-h6 font-weight-bold mb-2">
        {{ t('bookmarks.emptyTitle') }}
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('bookmarks.emptyText') }}
      </p>
      <v-btn
        color="primary"
        variant="flat"
        :to="localePath('/articles')"
        prepend-icon="mdi-newspaper-variant-outline"
      >
        {{ t('bookmarks.browseArticles') }}
      </v-btn>
    </v-sheet>

    <!-- List -->
    <v-row v-else>
      <v-col
        v-for="item in bookmarks.items"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card
          rounded="xl"
          elevation="0"
          class="reading-card h-100 d-flex flex-column"
          :to="localePath(`/articles/${item.slug}`)"
        >
          <div class="reading-card__media">
            <NuxtImg
              :src="item.coverImage || '/og-default.jpg'"
              :alt="title(item)"
              width="400"
              height="200"
              fit="cover"
              loading="lazy"
              class="reading-card__image"
            />
            <v-btn
              icon="mdi-bookmark-remove-outline"
              size="small"
              color="error"
              variant="flat"
              class="reading-card__remove"
              :aria-label="t('bookmarks.remove')"
              :title="t('bookmarks.remove')"
              @click.prevent.stop="onRemove(item.slug)"
            />
          </div>
          <v-card-text class="flex-grow-1 d-flex flex-column">
            <h3 class="reading-card__title text-subtitle-1 font-weight-bold mb-2">
              {{ title(item) }}
            </h3>
            <div class="d-flex align-center ga-3 text-caption text-medium-emphasis mt-auto">
              <span class="d-inline-flex align-center ga-1">
                <v-icon
                  icon="mdi-clock-outline"
                  size="14"
                />
                {{ item.readingTime }} {{ t('article.min') }}
              </span>
              <span
                v-if="formatDate(item.savedAt)"
                class="d-inline-flex align-center ga-1"
              >
                <v-icon
                  icon="mdi-bookmark-check-outline"
                  size="14"
                />
                {{ formatDate(item.savedAt) }}
              </span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.empty-state {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.15);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.reading-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  overflow: hidden;
}

.reading-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.reading-card__media {
  position: relative;
  line-height: 0;
}

.reading-card__image {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.reading-card__remove {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
}

.reading-card__title {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
