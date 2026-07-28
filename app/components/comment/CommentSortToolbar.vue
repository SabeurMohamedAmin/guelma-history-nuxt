<script setup lang="ts">
import type { CommentSort, CommentSortOrder } from '~~/shared/types/comment'

/**
 * Sort controls for the comment list: New / Top / Controversial, each toggleable
 * between ascending and descending. Bound with v-model:sort / v-model:order to
 * the composable, which mirrors them in the URL.
 */
defineProps<{
  sort: CommentSort
  order: CommentSortOrder
}>()

const emit = defineEmits<{
  'update:sort': [value: CommentSort]
  'update:order': [value: CommentSortOrder]
}>()

const { t } = useI18n()

const options = computed<{ value: CommentSort, label: string }[]>(() => [
  { value: 'new', label: t('comments.sortNew') },
  { value: 'top', label: t('comments.sortTop') },
  { value: 'controversial', label: t('comments.sortControversial') },
])
</script>

<template>
  <div class="comment-sort">
    <v-btn-toggle
      :model-value="sort"
      density="comfortable"
      variant="outlined"
      divided
      mandatory
      @update:model-value="value => emit('update:sort', value as CommentSort)"
    >
      <v-btn
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        size="small"
      >
        {{ opt.label }}
      </v-btn>
    </v-btn-toggle>

    <v-btn
      :icon="order === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending'"
      variant="text"
      density="comfortable"
      size="small"
      :aria-label="order === 'desc' ? t('comments.orderDesc') : t('comments.orderAsc')"
      @click="emit('update:order', order === 'desc' ? 'asc' : 'desc')"
    />
  </div>
</template>

<style scoped>
.comment-sort { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
</style>
