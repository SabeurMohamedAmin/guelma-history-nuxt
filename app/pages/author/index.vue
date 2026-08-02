<script setup lang="ts">
/**
 * Author dashboard.
 *
 * Mirrors the admin dashboard but scoped to the author: stats and the recent
 * list cover only the author's OWN articles (via the owner-scoped author API),
 * and the quick actions are limited to what an author can do. Layout/links use
 * the author flow.
 */

interface RecentArticle {
  id: string
  slug: string
  title: string
  category: string
  publishedAt: string
  status: 'published' | 'draft'
}

const { t, locale } = useI18n()
const { user } = useUserSession()
const localePath = useLocalePath()

definePageMeta({
  layout: 'author',
  middleware: ['author'],
})

const stats = ref({ articles: 0 })
const recentArticles = ref<RecentArticle[]>([])
const isLoading = ref(true)
const statsError = ref<string | null>(null)

async function fetchDashboardStats() {
  try {
    const articles = await $fetch<{ total: number }>('/api/author/articles/count')
    stats.value = { articles: articles.total }
  }
  catch (err: unknown) {
    statsError.value = extractErrorMessage(err, 'Unknown error')
  }
}

async function fetchRecentArticles() {
  try {
    recentArticles.value = await $fetch<RecentArticle[]>('/api/author/articles/recent')
  }
  catch {
    recentArticles.value = []
  }
}

async function loadDashboard() {
  isLoading.value = true
  await Promise.all([fetchDashboardStats(), fetchRecentArticles()])
  isLoading.value = false
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(
    locale.value === 'ar' ? 'ar-DZ' : 'fr-FR',
    { year: 'numeric', month: 'short', day: 'numeric' },
  )
}

function getStatusColor(status: RecentArticle['status']): string {
  return status === 'published' ? 'success' : 'warning'
}

onMounted(loadDashboard)
</script>

<template>
  <div class="pa-2">
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-6">
      <div>
        <h1 class="text-headline-small font-weight-bold">
          {{ t('admin.dashboard.welcome', { name: user?.displayName || user?.username }) }}
        </h1>
        <p class="text-body-2 text-medium-emphasis">
          {{ t('admin.dashboard.subtitle') }}
        </p>
      </div>

      <v-btn
        :to="localePath('/author/articles/create')"
        color="primary"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-plus"
      >
        {{ t('admin.dashboard.newArticle') }}
      </v-btn>
    </div>

    <v-row class="mb-6">
      <v-col
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card
          :to="localePath('/author/articles')"
          color="primary-lighten-5"
          variant="tonal"
          rounded="lg"
          class="cursor-pointer transition-swing"
          hover
        >
          <v-card-text class="d-flex align-center ga-3 pa-4">
            <v-sheet
              color="primary"
              width="44"
              height="44"
              rounded="lg"
              class="d-flex align-center justify-center flex-shrink-0"
            >
              <v-icon
                icon="mdi-text-box-multiple-outline"
                size="22"
                color="white"
              />
            </v-sheet>

            <div class="flex-grow-1">
              <div class="text-caption text-medium-emphasis">
                {{ t('author.myArticles') }}
              </div>
              <div class="text-headline-small font-weight-bold">
                <v-skeleton-loader
                  v-if="isLoading"
                  type="text"
                  width="48"
                />
                <span v-else>{{ stats.articles.toLocaleString() }}</span>
              </div>
            </div>

            <v-icon
              icon="mdi-chevron-right"
              size="18"
              class="text-medium-emphasis"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="statsError"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      {{ statsError }}
    </v-alert>

    <v-card
      rounded="lg"
      variant="outlined"
    >
      <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-medium pa-4">
        <v-icon
          icon="mdi-clock-outline"
          size="18"
        />
        {{ t('admin.dashboard.recentArticles') }}
        <v-spacer />
        <v-btn
          :to="localePath('/author/articles')"
          variant="text"
          size="small"
          color="primary"
          class="text-none"
        >
          {{ t('admin.dashboard.viewAll') }}
          <v-icon
            icon="mdi-chevron-right"
            size="16"
            end
          />
        </v-btn>
      </v-card-title>

      <v-divider />

      <template v-if="isLoading">
        <v-list-item
          v-for="i in 5"
          :key="i"
        >
          <v-skeleton-loader type="list-item-two-line" />
        </v-list-item>
      </template>

      <template v-else-if="recentArticles.length === 0">
        <div class="d-flex flex-column align-center justify-center pa-8 text-center">
          <v-icon
            icon="mdi-newspaper-variant-outline"
            size="40"
            color="disabled"
          />
          <p class="text-body-2 text-disabled mt-3 mb-0">
            {{ t('admin.dashboard.noArticles') }}
          </p>
          <v-btn
            :to="localePath('/author/articles/create')"
            color="primary"
            variant="tonal"
            size="small"
            rounded="lg"
            class="mt-3"
          >
            {{ t('admin.dashboard.newArticle') }}
          </v-btn>
        </div>
      </template>

      <v-list
        v-else
        class="py-0"
      >
        <v-list-item
          v-for="article in recentArticles"
          :key="article.id"
          :to="localePath(`/author/articles/${article.slug}`)"
          lines="two"
          class="border-bottom"
        >
          <template #prepend>
            <v-sheet
              color="primary-lighten-5"
              width="32"
              height="32"
              rounded="lg"
              class="d-flex align-center justify-center me-2"
            >
              <v-icon
                icon="mdi-text-box-outline"
                size="18"
                color="primary"
              />
            </v-sheet>
          </template>

          <v-list-item-title
            class="text-body-2 font-weight-medium text-truncate"
            style="max-width: 380px;"
          >
            {{ article.title }}
          </v-list-item-title>

          <v-list-item-subtitle class="d-flex align-center ga-2 mt-1">
            <v-chip
              size="x-small"
              variant="tonal"
              color="secondary"
            >
              {{ article.category }}
            </v-chip>
            <span class="text-caption text-disabled">{{ formatDate(article.publishedAt) }}</span>
          </v-list-item-subtitle>

          <template #append>
            <v-chip
              :color="getStatusColor(article.status)"
              size="x-small"
              variant="tonal"
              rounded="sm"
            >
              {{ t(`admin.status.${article.status}`) }}
            </v-chip>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </div>
</template>

<style scoped>
.border-bottom {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.v-list-item:last-child.border-bottom {
  border-bottom: none;
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
