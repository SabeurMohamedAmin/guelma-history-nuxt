<script setup lang="ts">
/**
 * Admin "All articles" window.
 *
 * Lists EVERY article (all owners) and is fully editable: admins manage all
 * content, so edit/delete are available on every row and drafts are included
 * (the status filter is shown). The admin's own creations are also listed in
 * the "My articles" window at /admin/articles.
 */

const { fetchArticles, deleteArticle, setHomePosition, loading, error } = useAdminArticles()

// keepalive: preserve scroll + state on return. Distinct key from the
// "My articles" page so the shared component is cached per window.
definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
  keepalive: true,
  key: 'admin-articles-all',
})
</script>

<template>
  <ArticleListView
    :fetcher="fetchArticles"
    :delete-article="deleteArticle"
    :set-home-position="setHomePosition"
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
