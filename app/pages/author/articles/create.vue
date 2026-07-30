<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

definePageMeta({ layout: 'author', middleware: ['author'] })

// Shared article form store, pointed at the author flow (author API endpoints
// + /author/articles redirect). Start from a clean slate (the store is shared
// with the edit page, so any previous edit session must be cleared here).
const store = useArticleFormStore()
store.configureFlow('author')
store.resetForm()
</script>

<template>
  <div class="editor-page mx-auto px-1 px-md-0">
    <AdminFormHeader />

    <!-- Server error banner: role="alert" so it is read out immediately. -->
    <v-alert
      v-if="store.serverError"
      type="error"
      variant="tonal"
      closable
      role="alert"
      class="mb-4"
      @click:close="store.serverError = null"
    >
      {{ store.serverError }}
    </v-alert>

    <v-form
      :ref="store.setFormRef"
      @submit.prevent="store.submit"
    >
      <!-- Sticky Publish / Discard bar, before the fields in tab order. -->
      <AdminFormActionBar />

      <v-row>
        <AdminFormMain />
        <AdminFormSidebar />
      </v-row>
    </v-form>
  </div>
</template>

<style scoped>
/* Keep the two columns readable instead of stretching on ultra-wide screens. */
.editor-page {
  max-inline-size: 1400px;
}
</style>
