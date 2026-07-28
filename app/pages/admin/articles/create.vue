<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

// Initialize the store and start from a clean slate (the store is shared with
// the edit page, so any previous edit session must be cleared here).
const store = useArticleFormStore()
store.resetForm()
</script>

<template>
  <div class="pa-1">
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
