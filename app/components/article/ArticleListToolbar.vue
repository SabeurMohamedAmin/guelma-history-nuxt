<script setup lang="ts">
import {
  ARTICLE_SORT_OPTIONS,
  DATE_RANGE_PRESETS,
  type DisplayMode,
} from '~~/app/constants/articleSort'

/**
 * ArticleListToolbar — presentation-only controls for an article listing.
 *
 * Two-way binds the active sort key, the date range and the display mode. Holds
 * no data and no fetching logic, so it can be dropped into any listing page.
 */
const sort = defineModel<string>('sort', { required: true })
const range = defineModel<string>('range', { required: true })
const displayMode = defineModel<DisplayMode>('displayMode', { required: true })

const props = defineProps<{
  /** Total number of results, shown alongside the controls. */
  total?: number
}>()

const { t } = useI18n()

const activeSortLabel = computed(() => {
  const option = ARTICLE_SORT_OPTIONS.find(o => o.value === sort.value)
  return option ? t(option.labelKey) : ''
})

const activeRangeLabel = computed(() => {
  const preset = DATE_RANGE_PRESETS.find(p => p.value === range.value)
  return preset ? t(preset.labelKey) : ''
})

function setDisplayMode(mode: DisplayMode) {
  displayMode.value = mode
}
</script>

<template>
  <div class="article-toolbar d-flex flex-wrap align-center justify-space-between ga-3">
    <p class="text-body-large align-center text-medium-emphasis my-0">
      {{ t('category.resultsCount', { count: props.total }) }}
    </p>

    <div class="d-flex align-center flex-wrap ga-2 ms-auto">
      <!-- Date range (timer) -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="tonal"
            color="primary"
            rounded="lg"
            size="default"
            class="text-none opacity-90 text-label-large text-sm-body-large"
          >
            <v-icon
              start
              icon="mdi-calendar-range"
              class="opacity-60 text-label-large text-sm-body-large"
            />
            {{ activeRangeLabel }}
            <v-icon
              end
              icon="mdi-chevron-down"
              size="18"
            />
          </v-btn>
        </template>

        <v-list
          density="compact"
          min-width="180"
          class="my-2"
        >
          <v-list-item
            v-for="preset in DATE_RANGE_PRESETS"
            :key="preset.value"
            :active="range === preset.value"
            @click="range = preset.value"
          >
            <v-list-item-title>{{ t(preset.labelKey) }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Sort -->
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="tonal"
            color="primary"
            rounded="lg"
            size="default"
            class="text-none opacity-90 text-label-large text-sm-body-large"
          >
            <v-icon
              start
              icon="mdi-sort"
              size="18"
              class="opacity-60"
            />
            {{ activeSortLabel }}
            <v-icon
              end
              icon="mdi-chevron-down"
              size="18"
            />
          </v-btn>
        </template>

        <v-list
          density="compact"
          min-width="200"
          class="my-2"
        >
          <v-list-item
            v-for="option in ARTICLE_SORT_OPTIONS"
            :key="option.value"
            :active="sort === option.value"
            @click="sort = option.value"
          >
            <template #prepend>
              <v-icon
                :icon="option.icon"
                size="20"
                class="opacity-60"
              />
            </template>
            <v-list-item-title>{{ t(option.labelKey) }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <!-- Display mode -->
      <v-btn-toggle
        :model-value="displayMode"
        color="primary"
        density="compact"
        variant="outlined"
        rounded="lg"
        mandatory
        @update:model-value="setDisplayMode"
      >
        <v-btn
          value="grid"
          size="x-small"
          :aria-label="t('category.displayGrid')"
        >
          <v-icon
            icon="mdi-view-grid-outline"
            class="opacity-60"
          />
        </v-btn>
        <v-btn
          value="rows"
          size="x-small"
          :aria-label="t('category.displayRows')"
        >
          <v-icon
            icon="mdi-view-sequential-outline"
            class="opacity-60"
          />
        </v-btn>
      </v-btn-toggle>
    </div>
  </div>
</template>
