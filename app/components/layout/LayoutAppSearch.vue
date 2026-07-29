<script setup lang="ts">
import { useDisplay } from 'vuetify'

/**
 * LayoutAppSearch — the site-wide search panel.
 *
 * Placement depends on the viewport:
 * - narrow screens: a plain centered dialog;
 * - wide screens: it drops right under the header search icon that opened it.
 *
 * The icon is found through the `data-search-activator` attribute, which both
 * header variants (guest and signed-in) put on their search button.
 */
const { t, locale } = useI18n()
const uiStore = useUiStore()
const { categories } = useNavCategories()
const { query, canSubmit, submit, reset } = useSearch()
const { width } = useDisplay()

/** Above this width the header shows its full nav, so the panel is anchored. */
const ANCHOR_MIN_WIDTH = 921

/** Gap left between the icon and the panel, in pixels. */
const ANCHOR_GAP = 10

/** Smallest distance the panel keeps from the viewport edge, in pixels. */
const ANCHOR_EDGE_PADDING = 12

const isOpen = computed({
  get: () => uiStore.searchOpen,
  set: (value: boolean) => {
    if (value) uiStore.openSearch()
    else uiStore.closeSearch()
  },
})

const inputRef = ref<{ focus: () => void } | null>(null)

const isRtl = computed(() => locale.value === 'ar')

/** Where the panel sits when anchored. `null` means "centered dialog". */
const anchor = ref<{ top: number, end: number } | null>(null)

const isAnchored = computed(() => anchor.value !== null)

// Read by the CSS below. Set on the overlay root so both values cascade down.
const anchorStyle = computed(() => (anchor.value
  ? {
      '--search-anchor-top': `${anchor.value.top}px`,
      '--search-anchor-end': `${anchor.value.end}px`,
    }
  : undefined))

// Grow out of the icon when anchored, out of the middle when centered.
const transformOrigin = computed(() => {
  if (!isAnchored.value) return 'center center'
  return isRtl.value ? 'top left' : 'top right'
})

/**
 * Measure the search icon currently on screen. Returns null on narrow
 * screens, or when no icon is visible (search can also be opened from a
 * link), in which case the panel stays a centered dialog.
 */
function measureActivator(): { top: number, end: number } | null {
  if (!import.meta.client || width.value < ANCHOR_MIN_WIDTH) return null

  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>('[data-search-activator]'),
  )

  // Both header variants are server-rendered and CSS hides one of them, so
  // pick the button that is actually displayed.
  const visible = buttons.find(button => button.offsetParent !== null)
  if (!visible) return null

  const rect = visible.getBoundingClientRect()

  // `inset-inline-end` is `left` in RTL and `right` in LTR: measure the side
  // the panel grows away from, and keep it clear of the viewport edge.
  const end = isRtl.value ? rect.left : window.innerWidth - rect.right

  return {
    top: Math.round(rect.bottom + ANCHOR_GAP),
    end: Math.round(Math.max(ANCHOR_EDGE_PADDING, end)),
  }
}

// `immediate` matters because this component is lazy-hydrated: on the very
// first open it mounts with the dialog ALREADY open, so a plain watcher
// would never fire and the input would not receive focus.
watch(isOpen, async (open) => {
  if (open) {
    anchor.value = measureActivator()
    await nextTick()
    inputRef.value?.focus()
  }
  else {
    reset()
  }
}, { immediate: true })

// Keep the panel under the icon when the window is resized or rotated, and
// let it fall back to the centered dialog below the breakpoint.
watch(width, () => {
  if (isOpen.value) anchor.value = measureActivator()
})

function close() {
  isOpen.value = false
}

async function onSubmit() {
  if (!canSubmit.value) return

  await submit()
  close()
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="760"
    scrim="rgba(15, 23, 42, 0.32)"
    :origin="transformOrigin"
    :transition="isAnchored ? 'slide-y-transition' : 'dialog-transition'"
    :class="['search-dialog', { 'search-dialog--anchored': isAnchored }]"
    :style="anchorStyle"
  >
    <v-card
      rounded="xl"
      elevation="0"
      class="search-modal border"
    >
      <v-card-text class="pa-4 pa-sm-6">
        <div class="d-flex align-start justify-space-between ga-3 mb-5">
          <div class="flex-grow-1">
            <h2 class="text-headline-small text-sm-h4 font-weight-bold mb-2 search-modal__title">
              {{ t('search.prompt') }}
            </h2>

            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ t('search.placeholder') }}
            </p>
          </div>

          <v-btn
            icon="mdi-close"
            variant="text"
            size="large"
            density="comfortable"
            class="flex-shrink-0 rounded-lg"
            :aria-label="t('common.cancel')"
            @click="close"
          />
        </div>

        <v-form
          role="search"
          :aria-label="t('search.title')"
          @submit.prevent="onSubmit"
        >
          <div class="d-flex flex-column flex-sm-row ga-3 align-stretch">
            <v-text-field
              ref="inputRef"
              v-model="query"
              type="search"
              enterkeyhint="search"
              :placeholder="t('search.placeholder')"
              :aria-label="t('search.inputLabel')"
              :dir="isRtl ? 'rtl' : 'ltr'"
              variant="solo"
              flat
              single-line
              hide-details
              density="comfortable"
              rounded="xl"
              autocomplete="off"
              class="search-modal__input flex-grow-1"
            >
              <template #prepend-inner>
                <v-icon
                  icon="mdi-magnify"
                  size="18"
                  class="text-medium-emphasis"
                />
              </template>
            </v-text-field>

            <v-btn
              color="primary"
              type="submit"
              rounded="xl"
              size="large"
              min-width="120"
              height="52"
              class="text-none font-weight-bold px-6"
              :disabled="!canSubmit"
            >
              {{ t('search.action') }}
            </v-btn>
          </div>
        </v-form>

        <nav
          class="mt-6"
          :aria-label="t('nav.categories')"
        >
          <div class="text-body-2 font-weight-medium text-medium-emphasis mb-3">
            {{ t('nav.categories') }}
          </div>

          <div class="d-flex flex-wrap ga-2">
            <!-- Real links: keyboard reachable, and open in a new tab if asked. -->
            <v-chip
              v-for="category in categories"
              :key="category.key"
              :to="category.to"
              variant="flat"
              rounded="lg"
              size="small"
              class="search-modal__chip"
              @click="close"
            >
              {{ category.title }}
            </v-chip>
          </div>
        </nav>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/*
 * Wide screens: drop the panel under the header search icon. The two custom
 * properties are set inline by `anchorStyle`, measured from the icon itself.
 * `inset-inline-end` keeps the panel on the correct side in Arabic (RTL).
 */
@media (min-width: 921px) {
  .search-dialog--anchored :deep(.v-overlay__content) {
    top: var(--search-anchor-top);
    inset-inline-end: var(--search-anchor-end);
    align-self: flex-start;
    margin: 0;
    width: min(760px, calc(100vw - var(--search-anchor-end) - 24px));
    max-height: calc(100vh - var(--search-anchor-top) - 16px);
  }
}

.search-modal {
  background-color: rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-border-color), 0.1) !important;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12),
              0 8px 24px rgba(15, 23, 42, 0.08);
}

.search-modal__title {
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.search-modal__input :deep(.v-field) {
  background-color: rgba(var(--v-theme-surface-variant), 0.28);
  border: 1px solid rgba(var(--v-border-color), 0.12);
  box-shadow: none;
}

.search-modal__input :deep(.v-field--focused) {
  border-color: rgba(var(--v-theme-primary), 0.32);
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.08);
}

.search-modal__chip {
  background-color: rgba(var(--v-theme-surface-variant), 0.32);
  border: 1px solid rgba(var(--v-border-color), 0.08);
  font-weight: 500;
}

@media (max-width: 599px) {
  .search-modal__title {
    font-size: 1.45rem !important;
  }
}
</style>
