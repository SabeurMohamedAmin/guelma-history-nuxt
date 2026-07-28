<script setup lang="ts">
const { t, locale } = useI18n()
const uiStore = useUiStore()
const { categories } = useNavCategories()
const { query, canSubmit, submit, reset } = useSearch()

const isOpen = computed({
  get: () => uiStore.searchOpen,
  set: (value: boolean) => {
    if (value) uiStore.openSearch()
    else uiStore.closeSearch()
  },
})

const inputRef = ref<{ focus: () => void } | null>(null)

// `immediate` matters because this component is lazy-hydrated: on the very
// first open it mounts with the dialog ALREADY open, so a plain watcher
// would never fire and the input would not receive focus.
watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    inputRef.value?.focus()
  }
  else {
    reset()
  }
}, { immediate: true })

function close() {
  isOpen.value = false
}

async function onSubmit() {
  if (!canSubmit.value) return

  await submit()
  close()
}

async function onSelectCategory(to: string) {
  close()
  await navigateTo(to)
}

const isRtl = computed(() => locale.value === 'ar')
</script>

<template>
  <v-dialog
    v-model="isOpen"
    persistent
    max-width="760"
    transition="dialog-top-transition"
    scrim="rgba(15, 23, 42, 0.32)"
    class="dialog-card"
  >
    <v-card
      rounded="xl"
      elevation="0"
      class="search-modal mx-sm-0 border"
    >
      <v-card-text class="pa-4 pa-sm-6">
        <div class="d-flex align-start justify-space-between ga-3 mb-5">
          <div class="flex-grow-1">
            <div class="text-headline-small text-sm-h4 font-weight-bold mb-2 search-modal__title">
              {{ t('search.prompt') }}
            </div>

            <div class="text-body-2 text-medium-emphasis">
              {{ t('search.placeholder') }}
            </div>
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

        <v-form @submit.prevent="onSubmit">
          <div class="d-flex flex-column flex-sm-row ga-3 align-stretch">
            <v-text-field
              ref="inputRef"
              v-model="query"
              :placeholder="t('search.placeholder')"
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

        <div class="mt-6">
          <div class="text-body-2 font-weight-medium text-medium-emphasis mb-3">
            {{ t('nav.categories') }}
          </div>

          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="category in categories"
              :key="category.key"
              variant="flat"
              rounded="lg"
              size="small"
              class="search-modal__chip"
              @click="onSelectCategory(category.to)"
            >
              {{ category.title }}
            </v-chip>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-card{
  transform: translateY(-15%) translateX(5%);
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
  .dialog-card{
    transform: translateY(-5%);
    min-width: 375px;
  }
}
</style>
