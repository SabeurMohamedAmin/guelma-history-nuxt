<script setup lang="ts">
import ArticleCard from '~/components/article/ArticleCard.vue'
import type { ArticleListItem } from '~~/shared/types/article'
import { useLocale } from 'vuetify'

const props = defineProps<{
  slug: string
  categorySlug?: string | null
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { isRtl } = useLocale()

const arrowIcon = computed(() =>
  isRtl.value ? 'mdi-arrow-left' : 'mdi-arrow-right',
)

const { data, pending } = await useFetch<{
  articles: ArticleListItem[]
  total: number
}>(
  () => `/api/articles/related/${props.slug}`,
  { key: () => `related-${props.slug}` },
)

const articles = computed(() => data.value?.articles ?? [])
const hasArticles = computed(() => articles.value.length > 0)

const viewMoreLink = computed(() =>
  localePath(props.categorySlug ? `/categories/${props.categorySlug}` : '/articles'),
)
</script>

<template>
  <section v-if="pending || hasArticles">
    <div class="d-flex align-center justify-space-between mb-8">
      <h2 class="text-headline-small font-weight-bold">
        {{ t('article.readNext') }}
      </h2>
      <v-btn
        :to="viewMoreLink"
        variant="text"
        color="primary"
        :append-icon="arrowIcon"
        class="text-body-2 font-weight-bold align-center"
      >
        {{ t('article.viewMore') }}
      </v-btn>
    </div>

    <v-row>
      <template v-if="pending && !hasArticles">
        <v-col
          v-for="i in 3"
          :key="`skeleton-${i}`"
          cols="12"
          sm="6"
          md="4"
        >
          <v-skeleton-loader
            type="image, article"
            class="rounded-xl"
          />
        </v-col>
      </template>

      <v-col
        v-for="article in articles"
        v-else
        :key="article.id"
        cols="12"
        sm="6"
        md="4"
      >
        <ArticleCard
          :article="article"
          variant="vertical"
        />
      </v-col>
    </v-row>
  </section>
</template>
