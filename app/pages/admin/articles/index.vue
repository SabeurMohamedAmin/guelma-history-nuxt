<script setup lang="ts">
/**
 * Admin "My articles" window.
 *
 * Lists ONLY the articles created by the acting admin (owner-scoped server-side)
 * and allows edit/delete. Every article across the site is managed from the
 * "All articles" window at /admin/articles/all. Both render <ArticleListView>.
 */

const { fetchMyArticles, deleteArticle, loading, error } = useAdminArticles()

// keepalive: caches this instance so returning from an edit restores scroll +
// state without re-searching. Distinct key keeps it separate from the
// "All articles" page (same shared component, different window).
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
  keepalive: true,
  key: 'admin-articles-mine',
})
</script>

<template>
  <ArticleListView
    :fetcher="fetchMyArticles"
    :delete-article="deleteArticle"
    :loading="loading"
    :error="error"
    editable
    edit-base-path="/admin/articles"
    create-to="/admin/articles/create"
    mine-to="/admin/articles"
    all-to="/admin/articles/all"
    categories-endpoint="/api/admin/categories"
  />
</template>
