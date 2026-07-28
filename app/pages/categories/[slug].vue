<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const { locale, t } = useI18n()

const slug = computed(() => String(route.params.slug))

const {
  sort,
  range,
  displayMode,
  category,
  articles,
  total,
  pending,
  error,
  isEmpty,
  refresh,
} = await useCategoryArticles(slug)

// Unknown slug -> a real 404. This used to live in a watchEffect, but a throw
// inside a reactive effect escapes the render pass: Nitro sees an unhandled
// error and answers 500, which Search Console reports as a "5XX page".
// A network/server failure keeps the inline retry placeholder instead.
if (!category.value && !error.value) {
  throw createError({
    statusCode: 404,
    statusMessage: t('category.notFound'),
    fatal: true,
  })
}

const hasError = computed(() => Boolean(error.value))

const categoryName = computed(() => {
  if (!category.value) return ''
  return locale.value === 'ar' ? category.value.nameAr : category.value.nameFr
})

useHead({
  title: () => categoryName.value || t('nav.categories'),
  meta: [
    {
      name: 'description',
      content: () => {
        if (!category.value) return ''
        return (locale.value === 'ar'
          ? category.value.descriptionAr
          : category.value.descriptionFr) ?? ''
      },
    },
  ],
})
</script>

<template>
  <div class="category-page">
    <!-- Header: image/icon + title + description -->
    <CategoryHeader
      v-if="category"
      :category="category"
      :total="total"
    />

    <!-- Navigation tools: date range (timer), sort & display mode -->
    <ArticleListToolbar
      v-model:sort="sort"
      v-model:range="range"
      v-model:display-mode="displayMode"
      :total="total"
      class="mb-5"
    />

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

    <!-- Error: fetch failed -->
    <CategoryStateMessage
      v-else-if="hasError"
      variant="error"
      @retry="refresh"
    />

    <!-- Empty: category has no articles yet -->
    <CategoryStateMessage
      v-else-if="isEmpty"
      variant="empty"
    />

    <!-- Articles -->
    <CategoryArticleList
      v-else
      :articles="articles"
      :display="displayMode"
    />
  </div>
</template>

<style scoped>
.category-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
