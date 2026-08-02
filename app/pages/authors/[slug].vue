<script setup lang="ts">
/**
 * Public author profile page.
 *
 * Shows the author's localized byline (avatar, name, bio, article count) and a
 * paginated grid of ONLY their published articles. Drafts are filtered out on
 * the server, so nothing unpublished can ever appear here. Unknown slug -> 404.
 */
definePageMeta({
  layout: 'default',
})

type PublicAuthor = {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar: string | null
}

type AuthorArticle = {
  id: string
  titleAr: string
  titleFr: string
  slug: string
  excerptAr: string | null
  excerptFr: string | null
  coverImage: string | null
  publishedAt: string | null
  readingTime: number
  commentCount: number
  categoryNameAr: string | null
  categoryNameFr: string | null
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => String(route.params.slug))

// Author profile. We send the active locale so the server returns the
// localized name/bio in one shot.
const { data: authorResponse, error: authorError } = await useFetch<{ success: boolean, data: PublicAuthor }>(
  () => `/api/authors/${slug.value}`,
  {
    key: () => `author-${slug.value}`,
    query: { locale },
  },
)

const author = computed(() => authorResponse.value?.data ?? null)

// Unknown slug -> render the framework 404 page.
if (authorError.value || !author.value) {
  throw createError({ statusCode: 404, statusMessage: t('authorProfile.notFoundTitle') })
}

// Published articles, paginated. We accumulate pages client-side for a simple
// "load more" experience while keeping each request small.
const page = ref(1)
const articles = ref<AuthorArticle[]>([])
const pagination = ref<Pagination | null>(null)
const loadingMore = ref(false)

const { data: articlesResponse, pending } = await useFetch<{
  success: boolean
  data: AuthorArticle[]
  pagination: Pagination
}>(
  () => `/api/authors/${slug.value}/articles`,
  {
    key: () => `author-articles-${slug.value}-${page.value}`,
    query: { page },
    watch: [page],
  },
)

// Merge each fetched page into the running list (replace on page 1).
watch(articlesResponse, (response) => {
  if (!response?.success) return
  articles.value = page.value === 1 ? response.data : [...articles.value, ...response.data]
  pagination.value = response.pagination
  loadingMore.value = false
}, { immediate: true })

const total = computed(() => pagination.value?.total ?? 0)
const hasMore = computed(() => Boolean(pagination.value && page.value < pagination.value.totalPages))
const isEmpty = computed(() => !pending.value && articles.value.length === 0)

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value += 1
}

const avatarAlt = computed(() => t('authorProfile.avatarAlt', { name: author.value?.name ?? '' }))

useHead({
  title: () => author.value?.name || t('nav.authors'),
  meta: [
    { name: 'description', content: () => author.value?.bio || author.value?.name || '' },
  ],
})
</script>

<template>
  <div class="author-page">
    <header class="author-header">
      <div
        class="author-header__glow"
        aria-hidden="true"
      ></div>

      <div class="author-header__content">
        <v-avatar
          size="104"
          class="author-header__avatar"
        >
          <NuxtImg
            v-if="author?.avatar"
            :src="author.avatar"
            :alt="avatarAlt"
            width="104"
            height="104"
            fit="cover"
          />
          <v-icon
            v-else
            icon="mdi-account"
            size="56"
          />
        </v-avatar>

        <h1 class="author-header__name">
          {{ author?.name }}
        </h1>

        <p
          v-if="author?.bio"
          class="author-header__bio"
        >
          {{ author.bio }}
        </p>

        <v-chip
          color="primary"
          variant="tonal"
          size="small"
          class="author-header__count"
        >
          <v-icon
            start
            size="x-small"
            icon="mdi-file-document-outline"
          />
          {{ t('authorProfile.articleCount', { count: total }, total) }}
        </v-chip>
      </div>
    </header>

    <h2 class="author-page__section-title">
      {{ t('authorProfile.articlesBy', { name: author?.name }) }}
    </h2>

    <div
      v-if="pending && articles.length === 0"
      class="d-flex justify-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="48"
      />
    </div>

    <v-card
      v-else-if="isEmpty"
      flat
      rounded="lg"
      class="text-center pa-12 author-page__empty"
    >
      <v-icon
        size="64"
        color="disabled"
        icon="mdi-file-document-outline"
      />
      <h3 class="text-headline-small mt-4 mb-2">
        {{ t('authorProfile.emptyTitle') }}
      </h3>
      <p class="text-body-2 text-disabled mb-4">
        {{ t('authorProfile.emptySubtitle') }}
      </p>
      <v-btn
        :to="localePath('/articles')"
        color="primary"
        variant="tonal"
      >
        {{ t('authorProfile.backToArticles') }}
      </v-btn>
    </v-card>

    <template v-else>
      <v-row>
        <v-col
          v-for="article in articles"
          :key="article.id"
          cols="12"
          sm="6"
          lg="4"
        >
          <ArticleCard
            :article="article"
            variant="vertical"
          />
        </v-col>
      </v-row>

      <div
        v-if="hasMore"
        class="d-flex justify-center mt-8"
      >
        <v-btn
          color="primary"
          variant="flat"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ t('authorProfile.loadMore') }}
        </v-btn>
      </div>
    </template>
  </div>
</template>

<style scoped>
.author-page {
  max-width: 1200px;
  margin: 0 auto;
}

.author-header {
  position: relative;
  overflow: hidden;
  margin-bottom: 2.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 20%, rgba(var(--v-theme-primary), 0.12), transparent 40%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9) 0%, rgba(var(--v-theme-primary), 0.06) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.author-header__glow {
  position: absolute;
  top: -8rem;
  inset-inline-start: -6rem;
  width: 22rem;
  height: 22rem;
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.22);
  pointer-events: none;
}

.author-header__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.author-header__avatar {
  border: 3px solid rgba(var(--v-theme-surface), 0.9);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  background: rgba(var(--v-theme-primary), 0.08);
}

.author-header__name {
  font-size: clamp(1.6rem, 4.5vw, 2.4rem);
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
}

.author-header__bio {
  max-width: 640px;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: clamp(0.95rem, 2.2vw, 1.1rem);
  line-height: 1.7;
}

.author-page__section-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.author-page__empty {
  background: rgba(var(--v-theme-primary), 0.04);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

@media (max-width: 960px) {
  .author-header {
    padding: 2.5rem 1rem;
  }
}
</style>
