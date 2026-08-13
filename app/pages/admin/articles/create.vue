<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

// Initialize the store and start from a clean slate (the store is shared with
// the edit page, so any previous edit session must be cleared here).
const store = useArticleFormStore()
store.configureFlow('admin')
store.resetForm()

// Pinia keeps the form store alive while navigating through the admin. Fetch
// fresh selectors whenever this page opens so newly created records appear.
onMounted(() => store.refreshOptions())
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
