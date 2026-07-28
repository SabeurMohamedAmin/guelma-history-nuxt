<script setup lang="ts">
import type { Category } from '~~/shared/types/category'

const props = defineProps<{
  categories: Category[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [slug: string | null]
}>()

const { locale, t } = useI18n()

const isRtl = computed(() => locale.value === 'ar')

// Map known category slugs to icons. Falls back gracefully for unknown slugs,
// since the Category type carries no `icon` field.
const ICON_BY_SLUG: Record<string, string> = {
  'sites-historiques': 'mdi-castle',
  'culture-patrimoine': 'mdi-palette',
  'evenements': 'mdi-calendar-star',
  'personnalites': 'mdi-account-group',
}

interface FilterItem {
  slug: string | null
  nameFr: string
  nameAr: string
  icon: string
}

const items = computed<FilterItem[]>(() => [
  {
    slug: null,
    nameFr: 'Tous les articles',
    nameAr: 'كل المقالات',
    icon: 'mdi-fire',
  },
  ...props.categories.map((cat): FilterItem => ({
    slug: cat.slug,
    nameFr: cat.nameFr,
    nameAr: cat.nameAr,
    icon: ICON_BY_SLUG[cat.slug] ?? 'mdi-tag',
  })),
])

function getCatName(item: FilterItem): string {
  return locale.value === 'ar' ? item.nameAr : item.nameFr
}

function isActive(slug: string | null): boolean {
  return props.modelValue === slug || (slug === null && !props.modelValue)
}

function selectCategory(slug: string | null): void {
  // Re-selecting the active chip clears the filter (back to "all").
  emit('update:modelValue', props.modelValue === slug ? null : slug)
}

// ── Custom prev/next controls (mobile) ─────────────────────────────────
// v-slide-group exposes scrollTo('prev' | 'next'), hasPrev and hasNext.
const slideGroup = ref<{
  scrollTo: (location: 'prev' | 'next') => void
  hasPrev: boolean
  hasNext: boolean
} | null>(null)

// In RTL the visual "previous" (start) maps to the group's "next", so swap
// which scroll direction each button triggers based on locale direction.
function scrollPrev(): void {
  slideGroup.value?.scrollTo(isRtl.value ? 'next' : 'prev')
}

function scrollNext(): void {
  slideGroup.value?.scrollTo(isRtl.value ? 'prev' : 'next')
}

const canScrollPrev = computed(() =>
  isRtl.value ? !!slideGroup.value?.hasNext : !!slideGroup.value?.hasPrev,
)
const canScrollNext = computed(() =>
  isRtl.value ? !!slideGroup.value?.hasPrev : !!slideGroup.value?.hasNext,
)
</script>

<template>
  <section
    class="topics-filter"
    :aria-label="t('category.topicsTitle')"
  >
    <!--
      Header for all breakpoints: the title with custom prev/next buttons
      beside it. These buttons drive the rail's scrolling.
    -->
    <div class="topics-filter__header d-flex align-center justify-space-between mb-4">
      <h2 class="topics-filter__title text-overline text-medium-emphasis">
        {{ t('category.topicsTitle') }}
      </h2>

      <div class="d-flex align-center ga-2">
        <v-btn
          icon
          variant="tonal"
          size="small"
          rounded="lg"
          density="comfortable"
          :disabled="!canScrollPrev"
          :aria-label="t('common.back')"
          @click="scrollPrev"
        >
          <v-icon
            :icon="isRtl ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            size="20"
          />
        </v-btn>
        <v-btn
          icon
          variant="tonal"
          size="small"
          rounded="lg"
          density="comfortable"
          :disabled="!canScrollNext"
          :aria-label="t('article.viewMore')"
          @click="scrollNext"
        >
          <v-icon
            :icon="isRtl ? 'mdi-chevron-left' : 'mdi-chevron-right'"
            size="20"
          />
        </v-btn>
      </div>
    </div>

    <!--
      Single source of truth for all breakpoints: a horizontally scrollable,
      scroll-snapping chip rail. The custom header buttons drive scrolling, so
      the built-in arrows are disabled.
    -->
    <v-slide-group
      ref="slideGroup"
      center-active
      role="group"
      :aria-label="t('category.topicsTitle')"
      class="topics-filter__rail"
    >
      <v-slide-group-item
        v-for="item in items"
        :key="String(item.slug)"
      >
        <v-chip
          :variant="isActive(item.slug) ? 'elevated' : 'tonal'"
          :color="isActive(item.slug) ? 'primary' : undefined"
          size="large"
          label
          rounded="lg"
          role="button"
          :aria-pressed="isActive(item.slug)"
          tabindex="0"
          class="topics-filter__chip ma-2"
          @click="selectCategory(item.slug)"
          @keydown.enter.prevent="selectCategory(item.slug)"
          @keydown.space.prevent="selectCategory(item.slug)"
        >
          <v-icon
            :icon="item.icon"
            size="18"
            start
          />
          <span class="text-none font-weight-medium">{{ getCatName(item) }}</span>
        </v-chip>
      </v-slide-group-item>
    </v-slide-group>
  </section>
</template>

<style scoped>
.topics-filter {
  padding-block: 0.5rem 1.5rem;
}

.topics-filter__title {
  letter-spacing: 0.08em;
}

@media (max-width: 600px) {
  .topics-filter__title {
    font-size: 1.2rem;
  }
}

@media (min-width: 601px) {
  .topics-filter__title {
    font-size: 1.3rem;
  }
}

/* Smooth, snappy horizontal scrolling on touch devices */
.topics-filter__rail :deep(.v-slide-group__content) {
  scroll-snap-type: x proximity;
  padding-inline: 0.25rem;
}

.topics-filter__chip {
  scroll-snap-align: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.topics-filter__chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(var(--v-theme-primary), 0.18);
}

/* Clear keyboard focus ring for accessibility */
.topics-filter__chip:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Built-in slide arrows are replaced by the custom header buttons */
.topics-filter__rail :deep(.v-slide-group__prev),
.topics-filter__rail :deep(.v-slide-group__next) {
  display: none;
}

/* Respect reduced-motion preferences */
@media (prefers-reduced-motion: reduce) {
  .topics-filter__chip {
    transition: none;
  }
}
</style>
