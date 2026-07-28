<script setup lang="ts">
// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCard {
  key: string
  icon: string
  color: string
  routeName: string
}

interface QuickAction {
  key: string
  icon: string
  color: string
  to: string
}

interface RecentArticle {
  id: number
  slug: string
  title: string
  category: string
  publishedAt: string
  status: 'published' | 'draft'
}

// ─── Composables ──────────────────────────────────────────────────────────────

const { t, locale } = useI18n()
const { user } = useUserSession()

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})

// ─── Stats configuration ──────────────────────────────────────────────────────

const STAT_CARDS: StatCard[] = [
  { key: 'articles', icon: 'mdi-text-box-multiple-outline', color: 'primary', routeName: 'admin-articles' },
  { key: 'categories', icon: 'mdi-folder-multiple-outline', color: 'secondary', routeName: 'admin-categories' },
  { key: 'authors', icon: 'mdi-account-group-outline', color: 'success', routeName: 'admin-authors' },
  { key: 'subscribers', icon: 'mdi-email-newsletter', color: 'warning', routeName: 'admin-subscribers' },
]

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'newArticle', icon: 'mdi-plus-circle-outline', color: 'primary', to: '/admin/articles/create' },
  { key: 'newCategory', icon: 'mdi-folder-plus-outline', color: 'secondary', to: '/admin/categories/create' },
  { key: 'newAuthor', icon: 'mdi-account-plus-outline', color: 'success', to: '/admin/authors/create' },
  { key: 'viewSite', icon: 'mdi-open-in-new', color: 'info', to: '/' },
]

// ─── Stats data ───────────────────────────────────────────────────────────────

const stats = ref({
  articles: 0,
  categories: 0,
  authors: 0,
  subscribers: 0,
})

const recentArticles = ref<RecentArticle[]>([])
const isLoading = ref(true)

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchDashboardStats() {
  try {
    const [articles, categories, authors, subscribers] = await Promise.all([
      $fetch<{ total: number }>('/api/admin/articles/count'),
      $fetch<{ total: number }>('/api/admin/categories/count'),
      $fetch<{ total: number }>('/api/admin/authors/count'),
      $fetch<{ total: number }>('/api/admin/subscribers/count'),
    ])
    stats.value = {
      articles: articles.total,
      categories: categories.total,
      authors: authors.total,
      subscribers: subscribers.total,
    }
  }
  catch (err: unknown) {
    // Show the actual error — 401 = session problem, 500 = DB problem
    statsError.value = extractErrorMessage(err, 'Unknown error')
    console.error('[Dashboard] Stats failed:', err)
  }
}

async function fetchRecentArticles() {
  try {
    recentArticles.value = await $fetch<RecentArticle[]>('/api/admin/articles/recent')
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatValue(key: string): number {
  return stats.value[key as keyof typeof stats.value] ?? 0
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

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(loadDashboard)

// ─── Error ────────────────────────────────────────────────────────────────
const statsError = ref<string | null>(null)
</script>

<template>
  <div class="pa-2">
    <!-- ── Page header ──────────────────────────────────────────────────────── -->
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-6">
      <div>
        <h1 class="text-headline-small font-weight-bold">
          {{ t('admin.dashboard.welcome', { name: user?.username }) }}
        </h1>
        <p class="text-body-2 text-medium-emphasis">
          {{ t('admin.dashboard.subtitle') }}
        </p>
      </div>

      <v-btn
        :to="$localePath('/admin/articles/create')"
        color="primary"
        variant="flat"
        rounded="lg"
        prepend-icon="mdi-plus"
      >
        {{ t('admin.dashboard.newArticle') }}
      </v-btn>
    </div>

    <!-- ── Stat cards ────────────────────────────────────────────────────────── -->
    <v-row class="mb-6">
      <v-col
        v-for="card in STAT_CARDS"
        :key="card.key"
        cols="12"
        sm="6"
        lg="3"
      >
        <v-card
          :to="$localePath(`/${card.routeName.replace('admin-', 'admin/')}`)"
          :color="`${card.color}-lighten-5`"
          variant="tonal"
          rounded="lg"
          class="cursor-pointer transition-swing"
          hover
        >
          <v-card-text class="d-flex align-center ga-3 pa-4">
            <v-sheet
              :color="card.color"
              width="44"
              height="44"
              rounded="lg"
              class="d-flex align-center justify-center flex-shrink-0"
            >
              <v-icon
                :icon="card.icon"
                size="22"
                color="white"
              />
            </v-sheet>

            <div class="flex-grow-1">
              <div class="text-caption text-medium-emphasis">
                {{ t(`admin.dashboard.stats.${card.key}`) }}
              </div>
              <div class="text-headline-small font-weight-bold">
                <v-skeleton-loader
                  v-if="isLoading"
                  type="text"
                  width="48"
                />
                <span v-else>{{ getStatValue(card.key).toLocaleString() }}</span>
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

    <!-- ── Main content grid ─────────────────────────────────────────────────── -->
    <v-row>
      <!-- Recent articles -->
      <v-col
        cols="12"
        lg="8"
      >
        <v-card
          rounded="lg"
          variant="text"
          class="border-opacity border"
        >
          <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-medium pa-4">
            <v-icon
              icon="mdi-clock-outline"
              size="18"
            />
            {{ t('admin.dashboard.recentArticles') }}
            <v-spacer />
            <v-btn
              :to="$localePath('/admin/articles')"
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

          <!-- Loading state -->
          <template v-if="isLoading">
            <v-list-item
              v-for="i in 5"
              :key="i"
            >
              <v-skeleton-loader type="list-item-two-line" />
            </v-list-item>
          </template>

          <!-- Empty state -->
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
                :to="$localePath('/admin/articles/create')"
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

          <!-- Articles list -->
          <v-list
            v-else
            class="py-0"
          >
            <v-list-item
              v-for="article in recentArticles"
              :key="article.id"
              :to="$localePath(`/admin/articles/${article.slug}`)"
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
      </v-col>

      <!-- Right column -->
      <v-col
        cols="12"
        lg="4"
      >
        <!-- density="compact" replaces the deprecated `dense` boolean -->
        <v-row
          density="compact"
          class="mb-2 ga-2"
        >
          <!-- Quick actions -->
          <v-col cols="12">
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
              variant="text"
              class="border-opacity border"
            >
              <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-medium pa-4">
                <v-icon
                  icon="mdi-lightning-bolt-outline"
                  size="18"
                />
                {{ t('admin.dashboard.quickActions') }}
              </v-card-title>

              <v-divider />

              <v-card-text class="pa-3">
                <!-- density="compact" replaces the deprecated `dense` boolean -->
                <v-row density="compact">
                  <v-col
                    v-for="action in QUICK_ACTIONS"
                    :key="action.key"
                    cols="6"
                  >
                    <v-btn
                      :to="$localePath(action.to)"
                      target="_blank"
                      :color="action.color"
                      variant="tonal"
                      rounded="lg"
                      block
                      class="flex-column ga-1"
                      height="64"
                    >
                      <v-icon
                        :icon="action.icon"
                        size="20"
                      />
                      <span class="text-caption text-none">
                        {{ t(`admin.dashboard.actions.${action.key}`) }}
                      </span>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Site overview -->
          <v-col cols="12">
            <v-card
              rounded="lg"
              variant="text"
              class="border-opacity border"
            >
              <v-card-title class="d-flex align-center ga-2 text-subtitle-1 font-weight-medium pa-4">
                <v-icon
                  icon="mdi-chart-donut"
                  size="18"
                />
                {{ t('admin.dashboard.overview') }}
              </v-card-title>

              <v-divider />

              <v-list class="py-0">
                <v-list-item
                  v-for="card in STAT_CARDS"
                  :key="card.key"
                  class="border-bottom"
                  density="compact"
                >
                  <template #prepend>
                    <v-icon
                      :icon="card.icon"
                      :color="card.color"
                      size="16"
                      class="me-3"
                    />
                  </template>

                  <v-list-item-title class="text-body-2">
                    {{ t(`admin.dashboard.stats.${card.key}`) }}
                  </v-list-item-title>

                  <template #append>
                    <span class="text-body-2 font-weight-medium">
                      <v-skeleton-loader
                        v-if="isLoading"
                        type="text"
                        width="24"
                      />
                      <span v-else>{{ getStatValue(card.key).toLocaleString() }}</span>
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
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
