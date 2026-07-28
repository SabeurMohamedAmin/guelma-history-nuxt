<script setup lang="ts">
/**
 * Author "All articles" window.
 *
 * Read-only browse of every PUBLISHED article (the author has no controls over
 * other authors' work). Rows link to the public article page. Editing the
 * author's own articles happens in the "My articles" window at /author/articles.
 *
 * Published-only, so the status filter is hidden (it would be a dead control).
 */

const { fetchAllArticles, loading, error } = useAuthorArticles()

// keepalive: preserve scroll + state on return. Distinct key from the
// "My articles" page so the shared component is cached per window.
definePageMeta({
  layout: 'author',
  middleware: ['author'],
  keepalive: true,
  key: 'author-articles-all',
})
</script>

<template>
  <ArticleListView
    :fetcher="fetchAllArticles"
    :loading="loading"
    :error="error"
    :editable="false"
    :show-status-filter="false"
    edit-base-path="/author/articles"
    public-base-path="/articles"
    create-to="/author/articles/create"
    mine-to="/author/articles"
    all-to="/author/articles/all"
    categories-endpoint="/api/categories"
  />
</template>
