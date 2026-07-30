<script setup lang="ts">
interface DashboardStat {
  key: keyof DashboardTotals
  icon: string
  color: string
  to: string
}

interface DashboardAction {
  key: string
  icon: string
  color: string
  to: string
  external?: boolean
}

interface DashboardTotals {
  articles: number
  categories: number
  authors: number
  subscribers: number
}

interface RecentArticle {
  id: number
  slug: string
  title: string
  category: string
  publishedAt: string
  status: 'published' | 'draft'
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { user } = useUserSession()

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

const stats: DashboardStat[] = [
  { key: 'articles', icon: 'mdi-text-box-multiple-outline', color: 'primary', to: '/admin/articles' },
  { key: 'categories', icon: 'mdi-shape-outline', color: 'secondary', to: '/admin/categories' },
  { key: 'authors', icon: 'mdi-account-group-outline', color: 'success', to: '/admin/authors' },
  { key: 'subscribers', icon: 'mdi-email-multiple-outline', color: 'warning', to: '/admin/subscribers' },
]

const quickActions: DashboardAction[] = [
  { key: 'newArticle', icon: 'mdi-file-document-plus-outline', color: 'primary', to: '/admin/articles/create' },
  { key: 'newCategory', icon: 'mdi-shape-plus-outline', color: 'secondary', to: '/admin/categories' },
  { key: 'newAuthor', icon: 'mdi-account-plus-outline', color: 'success', to: '/admin/authors/new' },
  { key: 'viewSite', icon: 'mdi-open-in-new', color: 'info', to: '/', external: true },
]

const totals = ref<DashboardTotals>({
  articles: 0,
  categories: 0,
  authors: 0,
  subscribers: 0,
})
const recentArticles = ref<RecentArticle[]>([])
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const displayName = computed(() => user.value?.displayName || user.value?.username || '')

async function loadDashboard() {
  isLoading.value = true
  errorMessage.value = null

  try {
    const [articles, categories, authors, subscribers, recent] = await Promise.all([
      $fetch<{ total: number }>('/api/admin/articles/count'),
      $fetch<{ total: number }>('/api/admin/categories/count'),
      $fetch<{ total: number }>('/api/admin/authors/count'),
      $fetch<{ total: number }>('/api/admin/subscribers/count'),
      $fetch<RecentArticle[]>('/api/admin/articles/recent'),
    ])

    totals.value = {
      articles: articles.total,
      categories: categories.total,
      authors: authors.total,
      subscribers: subscribers.total,
    }
    recentArticles.value = recent
  }
  catch (error: unknown) {
    errorMessage.value = extractErrorMessage(error, t('newsletter.error'))
  }
  finally {
    isLoading.value = false
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale.value === 'ar' ? 'ar-DZ' : 'fr-FR').format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(locale.value === 'ar' ? 'ar-DZ' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function statusColor(status: RecentArticle['status']): string {
  return status === 'published' ? 'success' : 'warning'
}

onMounted(loadDashboard)
</script>

<template>
  <main class="admin-dashboard">
    <v-card
      class="dashboard-hero mb-6"
      color="primary"
      rounded="xl"
      variant="flat"
    >
      <v-card-text class="pa-5 pa-md-8">
        <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-5">
          <div class="dashboard-hero__content">
            <v-chip
              color="white"
              variant="tonal"
              size="small"
              prepend-icon="mdi-view-dashboard-outline"
              class="mb-4"
            >
              {{ t('adminNav.dashboard') }}
            </v-chip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
              {{ t('admin.dashboard.welcome', { name: displayName }) }}
            </h1>
            <p class="text-body-1 mb-0 dashboard-hero__subtitle">
              {{ t('admin.dashboard.subtitle') }}
            </p>
          </div>

          <v-btn
            :to="localePath('/admin/articles/create')"
            color="white"
            size="large"
            rounded="lg"
            prepend-icon="mdi-plus"
            class="text-primary text-none align-self-start align-self-md-center"
          >
            {{ t('admin.dashboard.newArticle') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      rounded="lg"
      closable
      class="mb-6"
      @click:close="errorMessage = null"
    >
      <div class="d-flex flex-wrap align-center justify-space-between ga-2">
        <span>{{ errorMessage }}</span>
        <v-btn
          variant="text"
          size="small"
          @click="loadDashboard"
        >
          {{ t('common.submit') }}
        </v-btn>
      </div>
    </v-alert>

    <section
      :aria-label="t('admin.dashboard.overview')"
      class="mb-6"
    >
      <v-row>
        <v-col
          v-for="stat in stats"
          :key="stat.key"
          cols="12"
          sm="6"
          xl="3"
        >
          <v-card
            :to="localePath(stat.to)"
            rounded="xl"
            variant="flat"
            class="stat-card h-100 border"
          >
            <v-card-text class="pa-5">
              <div class="d-flex align-start justify-space-between ga-3">
                <v-avatar
                  :color="stat.color"
                  variant="tonal"
                  rounded="lg"
                  size="48"
                >
                  <v-icon :icon="stat.icon" />
                </v-avatar>
                <v-icon
                  icon="mdi-arrow-top-right"
                  size="18"
                  class="text-medium-emphasis stat-card__arrow"
                />
              </div>

              <div class="mt-5">
                <v-skeleton-loader
                  v-if="isLoading"
                  type="heading"
                  width="72"
                />
                <div
                  v-else
                  class="text-h4 font-weight-bold"
                >
                  {{ formatNumber(totals[stat.key]) }}
                </div>
                <div class="text-body-2 text-medium-emphasis mt-1">
                  {{ t(`admin.dashboard.stats.${stat.key}`) }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <v-row align="stretch">
      <v-col
        cols="12"
        lg="8"
      >
        <v-card
          rounded="xl"
          variant="flat"
          class="dashboard-panel border h-100"
        >
          <v-card-title class="d-flex align-center pa-5">
            <v-avatar
              color="primary"
              variant="tonal"
              rounded="lg"
              size="40"
              class="me-3"
            >
              <v-icon icon="mdi-history" />
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ t('admin.dashboard.recentArticles') }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ t('admin.dashboard.subtitle') }}
              </div>
            </div>
            <v-spacer />
            <v-btn
              :to="localePath('/admin/articles')"
              variant="text"
              color="primary"
              size="small"
              append-icon="mdi-arrow-right"
              class="text-none"
            >
              {{ t('admin.dashboard.viewAll') }}
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-list
            v-if="isLoading"
            lines="two"
            class="pa-2"
          >
            <v-list-item
              v-for="index in 4"
              :key="index"
            >
              <v-skeleton-loader type="list-item-avatar-two-line" />
            </v-list-item>
          </v-list>

          <div
            v-else-if="recentArticles.length === 0"
            class="empty-state pa-8 pa-md-12 text-center"
          >
            <v-avatar
              color="primary"
              variant="tonal"
              size="64"
              class="mb-4"
            >
              <v-icon
                icon="mdi-file-document-plus-outline"
                size="32"
              />
            </v-avatar>
            <h2 class="text-subtitle-1 font-weight-bold mb-2">
              {{ t('admin.dashboard.noArticles') }}
            </h2>
            <v-btn
              :to="localePath('/admin/articles/create')"
              color="primary"
              variant="tonal"
              rounded="lg"
              prepend-icon="mdi-plus"
              class="mt-2 text-none"
            >
              {{ t('admin.dashboard.newArticle') }}
            </v-btn>
          </div>

          <v-list
            v-else
            lines="two"
            class="article-list pa-2"
          >
            <v-list-item
              v-for="article in recentArticles"
              :key="article.id"
              :to="localePath(`/admin/articles/${article.slug}`)"
              rounded="lg"
              class="article-list__item mb-1"
            >
              <template #prepend>
                <v-avatar
                  color="primary"
                  variant="tonal"
                  rounded="lg"
                  class="me-3"
                >
                  <v-icon icon="mdi-text-box-outline" />
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ article.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="d-flex flex-wrap align-center ga-2 mt-1">
                <span>{{ article.category }}</span>
                <span aria-hidden="true">•</span>
                <time :datetime="article.publishedAt">
                  {{ formatDate(article.publishedAt) }}
                </time>
              </v-list-item-subtitle>

              <template #append>
                <v-chip
                  :color="statusColor(article.status)"
                  variant="tonal"
                  size="small"
                >
                  {{ t(`admin.status.${article.status}`) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        lg="4"
      >
        <v-card
          rounded="xl"
          variant="flat"
          class="dashboard-panel border h-100"
        >
          <v-card-title class="d-flex align-center pa-5">
            <v-avatar
              color="warning"
              variant="tonal"
              rounded="lg"
              size="40"
              class="me-3"
            >
              <v-icon icon="mdi-lightning-bolt-outline" />
            </v-avatar>
            <span class="text-subtitle-1 font-weight-bold">
              {{ t('admin.dashboard.quickActions') }}
            </span>
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-4">
            <v-row dense>
              <v-col
                v-for="action in quickActions"
                :key="action.key"
                cols="12"
                sm="6"
                lg="12"
                xl="6"
              >
                <v-card
                  :to="action.external ? undefined : localePath(action.to)"
                  :href="action.external ? localePath(action.to) : undefined"
                  :target="action.external ? '_blank' : undefined"
                  :rel="action.external ? 'noopener' : undefined"
                  rounded="lg"
                  variant="tonal"
                  :color="action.color"
                  class="action-card h-100"
                >
                  <v-card-text class="d-flex align-center ga-3 pa-4">
                    <v-icon
                      :icon="action.icon"
                      size="24"
                    />
                    <span class="text-body-2 font-weight-bold">
                      {{ t(`admin.dashboard.actions.${action.key}`) }}
                    </span>
                    <v-spacer />
                    <v-icon
                      :icon="action.external ? 'mdi-open-in-new' : 'mdi-chevron-right'"
                      size="16"
                    />
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </main>
</template>

<style scoped>
.admin-dashboard {
  width: min(100%, 1600px);
  margin-inline: auto;
  padding-block: 8px 32px;
}

.dashboard-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-secondary))) !important;
}

.dashboard-hero::after {
  position: absolute;
  inset-block-start: -80px;
  inset-inline-end: -60px;
  width: 240px;
  height: 240px;
  border: 48px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  content: '';
  pointer-events: none;
}

.dashboard-hero__content {
  position: relative;
  z-index: 1;
  max-width: 720px;
}

.dashboard-hero__subtitle {
  color: rgba(255, 255, 255, 0.78);
}

.stat-card,
.action-card,
.article-list__item {
  transition: transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.stat-card:hover,
.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(var(--v-theme-on-surface), 0.1);
}

.stat-card:hover .stat-card__arrow {
  color: rgb(var(--v-theme-primary)) !important;
}

.dashboard-panel {
  background: rgb(var(--v-theme-surface));
}

.article-list__item:hover {
  background: rgba(var(--v-theme-primary), 0.06);
}

.empty-state {
  min-height: 320px;
}

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .action-card,
  .article-list__item {
    transition: none;
  }

  .stat-card:hover,
  .action-card:hover {
    transform: none;
  }
}
</style>
