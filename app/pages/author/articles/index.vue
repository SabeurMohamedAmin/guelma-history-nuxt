<script setup lang="ts">
/**
 * Author "My articles" window.
 *
 * Lists ONLY the acting author's own articles (owner-scoped server-side) and
 * allows edit/delete. The read-only "All articles" browse lives at
 * /author/articles/all. Both render the shared <ArticleListView>.
 */

const { fetchArticles, deleteArticle, loading, error } = useAuthorArticles()

// keepalive: caches this instance so returning from an edit restores scroll +
// state without re-searching. A distinct key keeps it separate from the
// "All articles" page (same shared component, different window).
definePageMeta({
  layout: 'author',
  middleware: ['author'],
  keepalive: true,
  key: 'author-articles-mine',
})
</script>

<template>
  <ArticleListView
    :fetcher="fetchArticles"
    :delete-article="deleteArticle"
    :loading="loading"
    :error="error"
    editable
    edit-base-path="/author/articles"
    create-to="/author/articles/create"
    mine-to="/author/articles"
    all-to="/author/articles/all"
    categories-endpoint="/api/categories"
  />
</template>
