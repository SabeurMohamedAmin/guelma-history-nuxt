<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'

/**
 * CategoryGrid — pure presentation component.
 *
 * Renders a responsive grid of category cards. It does NOT fetch data; the
 * parent passes categories in. This keeps the component reusable and easy to
 * test or restyle later.
 */
const props = defineProps<{
  categories: CategoryTree[]
}>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const { getCategoryIcon } = useCategoryIcon()

function getName(category: CategoryTree): string {
  return locale.value === 'ar' ? category.nameAr : category.nameFr
}

function getDescription(category: CategoryTree): string {
  const description = locale.value === 'ar'
    ? category.descriptionAr
    : category.descriptionFr

  return description ?? ''
}

function getCategoryLink(slug: string): string {
  return localePath(`/categories/${slug}`)
}

function getArticleCount(category: CategoryTree): number {
  return category.articleCount ?? 0
}
</script>

<template>
  <v-row>
    <v-col
      v-for="category in props.categories"
      :key="category.id"
      cols="12"
      sm="6"
      md="4"
    >
      <NuxtLink
        :to="getCategoryLink(category.slug)"
        class="text-decoration-none d-block h-100"
      >
        <v-card
          flat
          rounded="lg"
          class="category-card pa-4 h-100 d-flex flex-column"
        >
          <v-avatar
            color="primary"
            variant="tonal"
            size="52"
            class="mb-4"
          >
            <v-icon
              :icon="getCategoryIcon(category.slug)"
              size="26"
            />
          </v-avatar>

          <h3 class="text-headline-small font-weight-bold mb-2">
            {{ getName(category) }}
          </h3>

          <p
            v-if="getDescription(category)"
            class="text-body-2 text-medium-emphasis mb-4 category-card__description"
          >
            {{ getDescription(category) }}
          </p>

          <div class="d-flex align-center justify-space-between mt-auto pt-2">
            <v-chip
              size="small"
              color="primary"
              variant="tonal"
              class="font-weight-medium"
            >
              {{ getArticleCount(category) }} {{ t('category.articleCount') }}
            </v-chip>
            <v-icon
              :icon="locale === 'ar' ? 'mdi-arrow-left' : 'mdi-arrow-right'"
              size="20"
              class="category-card__arrow text-primary"
            />
          </div>
        </v-card>
      </NuxtLink>
    </v-col>
  </v-row>
</template>

<style scoped>
.category-card {
  background: rgb(var(--v-theme-surface));
  /* Transparent border by default so revealing it on hover does not shift the
     layout. Mirrors the home article cards: no chrome until hovered. */
  border: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.category-card:hover {
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.category-card__description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .category-card {
    transition: none;
  }
}
</style>
