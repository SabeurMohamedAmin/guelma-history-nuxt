<script setup lang="ts">
/**
 * Language switcher with scroll-position preservation.
 *
 * The router reads this saved value after the localized route changes.
 * Keep this key identical to the one in app/router.options.ts.
 */

type LocaleCode = 'fr' | 'ar'

interface LocaleOption {
  code: LocaleCode
  label: string
}

const props = withDefaults(
  defineProps<{
    /**
     * Makes the trigger full width.
     * Useful inside a mobile navigation drawer.
     */
    block?: boolean
  }>(),
  {
    block: false,
  },
)

const LOCALE_SCROLL_KEY = 'locale-switch-scroll-position'

const { locale, locales, setLocale, t } = useI18n()

const isChanging = ref(false)

const localeOptions = computed<LocaleOption[]>(() =>
  (locales.value as Array<{ code: LocaleCode, name?: string }>).map(locale => ({
    code: locale.code,
    label: locale.name ?? locale.code.toUpperCase(),
  })),
)

const currentLocale = computed(() =>
  localeOptions.value.find(item => item.code === locale.value),
)

const currentLabel = computed(() =>
  currentLocale.value?.label ?? locale.value.toUpperCase(),
)

/**
 * Saves the current reading position, then lets Nuxt i18n navigate to the
 * equivalent localized route.
 */
async function changeLocale(code: LocaleCode) {
  if (code === locale.value || isChanging.value) {
    return
  }

  isChanging.value = true

  if (import.meta.client) {
    sessionStorage.setItem(
      LOCALE_SCROLL_KEY,
      JSON.stringify({
        left: window.scrollX,
        top: window.scrollY,
      }),
    )
  }

  try {
    await setLocale(code)
  }
  finally {
    isChanging.value = false
  }
}
</script>

<template>
  <v-menu
    location="bottom end"
    offset="8"
    transition="slide-y-transition"
  >
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        variant="text"
        density="comfortable"
        rounded="pill"
        :block="props.block"
        :loading="isChanging"
        :disabled="isChanging"
        prepend-icon="mdi-translate"
        append-icon="mdi-chevron-down"
        :aria-label="t('nav.language')"
        class="text-none font-weight-medium"
      >
        {{ currentLabel }}
      </v-btn>
    </template>

    <v-list
      min-width="180"
      nav
      density="comfortable"
      rounded="lg"
      elevation="8"
      class="pa-1"
    >
      <v-list-item
        v-for="item in localeOptions"
        :key="item.code"
        :active="item.code === locale"
        :disabled="isChanging"
        rounded="md"
        @click="changeLocale(item.code)"
      >
        <template #prepend>
          <v-icon
            size="x-small"
            class="opacity-50"
            :icon="item.code === locale
              ? 'mdi-check-circle'
              : 'mdi-circle-outline'"
            :color="item.code === locale ? 'primary' : undefined"
          />
        </template>

        <v-list-item-title class="font-weight-medium">
          {{ item.label }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<style scoped>
/* Only needed for a small visual refinement not covered by Vuetify utilities. */
:deep(.v-btn) {
  letter-spacing: 0;
}
</style>
