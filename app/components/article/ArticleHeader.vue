<script setup lang="ts">
import type { ArticleView } from '~/composables/useArticleDetail'

/**
 * Article hero: category, save button, title, intro and byline next to the
 * cover image on desktop, stacked on mobile.
 *
 * The <h1> keeps the id "article-title", which the page's <article> element
 * points at with aria-labelledby.
 */
defineProps<{
  view: ArticleView
}>()
</script>

<template>
  <v-sheet
    tag="header"
    class="rounded-xl glass-surface article-header overflow-hidden mb-8 mb-md-10 pa-0"
  >
    <v-row
      no-gutters
      align="start"
    >
      <v-col
        cols="12"
        md="6"
        class="pa-2 pa-md-3"
      >
        <div class="d-flex align-center justify-space-between ga-2 mb-4">
          <v-chip
            :to="view.categoryTo || undefined"
            color="primary"
            variant="flat"
            size="small"
            class="font-weight-bold"
          >
            {{ view.categoryName }}
          </v-chip>

          <ArticleBookmarkButton
            :article-slug="view.slug"
            variant="button"
          />
        </div>

        <h1
          id="article-title"
          class="article-header__title text-headline-small text-sm-headline-medium font-weight-bold mb-4"
        >
          {{ view.title }}
        </h1>

        <p
          v-if="view.excerpt"
          class="article-header__excerpt text-body-1 text-medium-emphasis mb-6"
        >
          {{ view.excerpt }}
        </p>

        <ArticleMeta
          :author-name="view.authorName"
          :author-to="view.authorTo"
          :published-iso="view.publishedIso"
          :published-label="view.publishedLabel"
          :reading-time-label="view.readingTimeLabel"
        />
      </v-col>

      <v-col
        cols="12"
        md="6"
        class="pa-1 pa-md-2 rounded-xl"
      >
        <ArticleHero
          :image-url="view.coverSrc"
          :alt="view.title"
        />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<style scoped>
/* Brand tint layered over the shared glass background. */
.article-header {
  background-image:
    radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.12), transparent 36%),
    linear-gradient(
      180deg,
      rgba(var(--v-theme-surface), 0.88),
      rgba(var(--v-theme-surface), 0.72)
    );
}

.article-header__title {
  line-height: 1.25;
}

/* ~68 characters is the comfortable reading width for an intro. */
.article-header__excerpt {
  max-width: 68ch;
  line-height: 1.85;
}
</style>
