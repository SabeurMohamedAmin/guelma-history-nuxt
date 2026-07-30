<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

definePageMeta({ layout: 'admin', middleware: ['admin'] })

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

// The shared form store is reused across create/edit. Here we hydrate it from
// the article matching the [slug] route param so the same form components
// (header / main / sidebar) render in "edit" mode.
const store = useArticleFormStore()

const slug = computed(() => String(route.params.slug))

async function load() {
  await store.loadArticle(slug.value)
}

// Load on mount and whenever the slug changes (e.g. navigating between articles
// without a full page reload).
watch(slug, load, { immediate: true })

// Avoid leaking the edited article into a subsequent "create" session.
onBeforeUnmount(() => store.resetForm())
</script>

<template>
  <div class="editor-page mx-auto px-1 px-md-0">
    <!-- Loading skeleton: keeps layout stable while the article is fetched. -->
    <template v-if="store.fetching">
      <div class="d-flex align-center ga-3 mb-6">
        <v-skeleton-loader type="avatar" />
        <div class="flex-grow-1">
          <v-skeleton-loader
            type="heading"
            class="mb-2"
          />
          <v-skeleton-loader
            type="text"
            width="260"
          />
        </div>
      </div>
      <v-row>
        <v-col
          cols="12"
          md="8"
        >
          <v-skeleton-loader
            type="card"
            class="mb-4"
          />
          <v-skeleton-loader
            type="card"
            class="mb-4"
          />
          <v-skeleton-loader type="article" />
        </v-col>
        <v-col
          cols="12"
          md="4"
        >
          <v-skeleton-loader
            type="card"
            class="mb-4"
          />
          <v-skeleton-loader type="image" />
        </v-col>
      </v-row>
    </template>

    <!-- Not found: the slug doesn't match any article. -->
    <v-card
      v-else-if="store.notFound"
      variant="outlined"
      class="pa-8 text-center mx-auto"
      max-width="480"
      rounded="lg"
    >
      <v-icon
        icon="mdi-file-search-outline"
        size="56"
        color="medium-emphasis"
        class="mb-4"
      />
      <h2 class="text-headline-small font-weight-semibold mb-2">
        {{ t('articleForm.notFoundTitle') }}
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('articleForm.notFoundText', { slug }) }}
      </p>
      <v-btn
        color="primary"
        variant="flat"
        prepend-icon="mdi-arrow-left"
        :to="localePath('/admin/articles')"
      >
        {{ t('articleForm.backToList') }}
      </v-btn>
    </v-card>

    <!-- Edit form: same components used by the create page, now in edit mode. -->
    <template v-else>
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
        <!-- Sticky Save / Discard bar, before the fields in tab order. -->
        <AdminFormActionBar />

        <v-row>
          <AdminFormMain />
          <AdminFormSidebar />
        </v-row>
      </v-form>
    </template>
  </div>
</template>

<style scoped>
/* Keep the two columns readable instead of stretching on ultra-wide screens. */
.editor-page {
  max-inline-size: 1400px;
}
</style>
