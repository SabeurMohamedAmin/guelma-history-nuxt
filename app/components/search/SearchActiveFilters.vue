<script setup lang="ts">
import type { SearchFilterKey } from '~~/shared/types/search'

/**
 * SearchActiveFilters — the criteria behind the current results, as chips.
 *
 * Each chip removes one criterion, so users can widen a search without
 * scrolling back up to the form. Renders nothing when no filter is active.
 */
const props = defineProps<{
  /** The submitted search term (not the live input value). */
  q: string
  /** Category name, already resolved in the active locale. */
  categoryLabel: string | null
  dateFrom: string | null
  dateTo: string | null
}>()

const emit = defineEmits<{
  remove: [key: SearchFilterKey]
  clear: []
}>()

const { t } = useI18n()

const chips = computed(() => {
  const list: { key: SearchFilterKey, label: string, icon: string }[] = []

  if (props.q) {
    list.push({ key: 'q', label: props.q, icon: 'mdi-magnify' })
  }
  if (props.categoryLabel) {
    list.push({ key: 'category', label: props.categoryLabel, icon: 'mdi-shape-outline' })
  }
  if (props.dateFrom) {
    list.push({ key: 'dateFrom', label: `${t('search.dateFrom')}: ${props.dateFrom}`, icon: 'mdi-calendar-start' })
  }
  if (props.dateTo) {
    list.push({ key: 'dateTo', label: `${t('search.dateTo')}: ${props.dateTo}`, icon: 'mdi-calendar-end' })
  }

  return list
})
</script>

<template>
  <div
    v-if="chips.length"
    class="d-flex flex-wrap align-center ga-2"
  >
    <span class="text-body-2 text-medium-emphasis">
      {{ t('search.activeFilters') }}
    </span>

    <v-chip
      v-for="chip in chips"
      :key="chip.key"
      :prepend-icon="chip.icon"
      color="primary"
      variant="tonal"
      rounded="lg"
      size="small"
      closable
      @click:close="emit('remove', chip.key)"
    >
      {{ chip.label }}
    </v-chip>

    <v-btn
      variant="text"
      size="small"
      rounded="lg"
      class="text-none"
      @click="emit('clear')"
    >
      {{ t('search.clearAll') }}
    </v-btn>
  </div>
</template>
