<script setup lang="ts">
/**
 * Public authors index.
 *
 * /authors was listed in sitemap.xml but had no page and no incoming internal
 * link, which is what Search Console reported as an orphan page. This page is
 * the hub: the header and the footer link here, and each card links to an
 * author profile, so /authors/:slug is reachable by crawling too.
 *
 * Only authors with at least one published article are returned by the API.
 */
definePageMeta({
  layout: 'default',
})

type AuthorCard = {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar: string | null
  articleCount: number
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: response, pending } = await useFetch<{ success: boolean, data: AuthorCard[] }>(
  '/api/authors',
  {
    key: () => `authors-index-${locale.value}`,
    query: { locale },
  },
)

const authors = computed(() => response.value?.data ?? [])
const hasAuthors = computed(() => authors.value.length > 0)

// First letter of the name, shown when an author has no avatar.
function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

useHead({
  title: () => t('authors.indexTitle'),
  meta: [
    { name: 'description', content: () => t('authors.indexSubtitle') },
  ],
})
</script>

<template>
  <div class="authors-page">
    <header class="authors-page__header mb-8 text-center">
      <v-chip
        color="primary"
        variant="elevated"
        size="small"
        class="mb-4"
      >
        <v-icon
          start
          size="x-small"
          icon="mdi-account-group-outline"
        />
        {{ t('nav.authors') }}
      </v-chip>

      <h1 class="authors-page__title mb-3">
        {{ t('authors.indexTitle') }}
      </h1>

      <p class="authors-page__subtitle">
        {{ t('authors.indexSubtitle') }}
      </p>
    </header>

    <!-- Loading -->
    <div
      v-if="pending"
      class="d-flex justify-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="48"
      />
    </div>

    <!-- Grid -->
    <v-row v-else-if="hasAuthors">
      <v-col
        v-for="author in authors"
        :key="author.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card
          :to="localePath(`/authors/${author.slug}`)"
          class="authors-card h-100 pa-5"
          variant="flat"
          rounded="xl"
        >
          <div class="d-flex align-center ga-4 mb-3">
            <v-avatar
              size="64"
              color="primary"
            >
              <v-img
                v-if="author.avatar"
                :src="author.avatar"
                :alt="author.name"
              />
              <span
                v-else
                class="text-h6"
              >{{ initial(author.name) }}</span>
            </v-avatar>

            <div>
              <h2 class="text-subtitle-1 font-weight-bold mb-1">
                {{ author.name }}
              </h2>
              <span class="text-caption text-medium-emphasis">
                {{ t('authorProfile.articleCount', author.articleCount) }}
              </span>
            </div>
          </div>

          <p
            v-if="author.bio"
            class="authors-card__bio text-body-2 text-medium-emphasis mb-0"
          >
            {{ author.bio }}
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty state -->
    <v-card
      v-else
      flat
      rounded="xl"
      class="text-center pa-12 authors-page__empty"
    >
      <v-icon
        size="64"
        color="disabled"
        icon="mdi-account-group-outline"
      />
      <h2 class="text-headline-small mt-4 mb-2">
        {{ t('authors.empty') }}
      </h2>
      <p class="text-body-2 text-disabled mb-0">
        {{ t('authors.emptySubtitle') }}
      </p>
    </v-card>
  </div>
</template>

<style scoped>
.authors-page {
  max-width: 1200px;
  margin: 0 auto;
}

.authors-page__title {
  font-size: clamp(1.8rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1.1;
}

.authors-page__subtitle {
  font-size: clamp(0.95rem, 2.2vw, 1.15rem);
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 600px;
  margin: 0 auto;
}

.authors-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.authors-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.1);
}

/* Keep every card the same height whatever the bio length. */
.authors-card__bio {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.authors-page__empty {
  background: rgba(var(--v-theme-primary), 0.04);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .authors-card {
    transition: none;
  }

  .authors-card:hover {
    transform: none;
  }
}
</style>
