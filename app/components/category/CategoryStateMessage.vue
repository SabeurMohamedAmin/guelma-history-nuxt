<script setup lang="ts">
/**
 * CategoryStateMessage — pure presentation placeholder.
 *
 * Renders a friendly empty/error state for an article listing. Use `variant`
 * to pick the look; pass a `@retry` listener to show a retry button (typically
 * for the error variant).
 */
const props = withDefaults(defineProps<{
  variant?: 'empty' | 'error'
}>(), {
  variant: 'empty',
})

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()

const isError = computed(() => props.variant === 'error')

const icon = computed(() =>
  isError.value ? 'mdi-alert-circle-outline' : 'mdi-file-document-outline',
)

const iconColor = computed(() => (isError.value ? 'error' : 'disabled'))

const title = computed(() =>
  isError.value ? t('category.errorTitle') : t('category.noArticles'),
)

const subtitle = computed(() =>
  isError.value ? t('category.errorSubtitle') : t('category.noArticlesSubtitle'),
)
</script>

<template>
  <v-card
    flat
    rounded="lg"
    class="text-center pa-12 category-state"
    :class="isError ? 'category-state--error' : 'category-state--empty'"
  >
    <v-icon
      size="64"
      :color="iconColor"
      :icon="icon"
    />

    <h2 class="text-headline-small mt-4 mb-2">
      {{ title }}
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-0">
      {{ subtitle }}
    </p>

    <v-btn
      v-if="isError"
      color="primary"
      variant="tonal"
      rounded="lg"
      class="text-none mt-6"
      @click="emit('retry')"
    >
      <v-icon
        start
        icon="mdi-refresh"
        size="18"
      />
      {{ t('category.retry') }}
    </v-btn>
  </v-card>
</template>

<style scoped>
.category-state--empty {
  background: rgba(var(--v-theme-primary), 0.04);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.category-state--error {
  background: rgba(var(--v-theme-error), 0.04);
  border: 1px solid rgba(var(--v-theme-error), 0.18);
}
</style>
