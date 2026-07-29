<script setup lang="ts">
import type { DisplayMode } from '~~/app/constants/articleSort'

/**
 * SearchResultsSkeleton — placeholder cards shown while results load.
 *
 * It mirrors the shape of the real list (grid or rows) so the page does not
 * jump when the data arrives. Hidden from assistive tech: the surrounding
 * live region already announces that a search is running.
 */
withDefaults(defineProps<{
  display: DisplayMode
  /** How many placeholders to render. */
  count?: number
}>(), {
  count: 6,
})
</script>

<template>
  <div aria-hidden="true">
    <v-row v-if="display === 'grid'">
      <v-col
        v-for="index in count"
        :key="index"
        cols="12"
        sm="6"
        md="4"
      >
        <v-skeleton-loader
          type="image, article"
          rounded="lg"
        />
      </v-col>
    </v-row>

    <div
      v-else
      class="d-flex flex-column ga-3"
    >
      <v-skeleton-loader
        v-for="index in count"
        :key="index"
        type="list-item-avatar-three-line"
        rounded="lg"
      />
    </div>
  </div>
</template>
