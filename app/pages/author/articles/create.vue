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
  <div>
    <!-- Header Component -->
    <AdminFormHeader />

    <!-- Server error banner -->
    <v-alert
      v-if="store.serverError"
      type="error"
      variant="tonal"
      closable
      class="mb-6"
      @click:close="store.serverError = null"
    >
      {{ store.serverError }}
    </v-alert>

    <!-- Form Wrapper -->
    <v-form
      :ref="store.setFormRef"
      @submit.prevent="store.submit"
    >
      <v-row>
        <!-- Main Content Component -->
        <AdminFormMain />

        <!-- Sidebar Component -->
        <AdminFormSidebar />
      </v-row>
    </v-form>
  </div>
</template>
