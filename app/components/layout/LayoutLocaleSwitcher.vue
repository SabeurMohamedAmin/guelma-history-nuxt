<script setup lang="ts">
/**
 * Language switcher built on v-menu.
 *
 * Driven by the i18n locale config so it scales beyond the current two
 * languages without code changes. Each option shows the language in its own
 * script (e.g. "العربية", "Français"). Set `block` for the full-width variant
 * used in the mobile drawer.
 */
import { useDisplay } from 'vuetify'

withDefaults(defineProps<{ block?: boolean }>(), { block: false })
const { smAndDown, lgAndUp } = useDisplay()

const { locale, locales, setLocale, t } = useI18n()

interface LocaleOption {
  value: string
  title: string
}

// The i18n config defines locales as objects with `code` and `name`.
const options = computed<LocaleOption[]>(() =>
  (locales.value as Array<{ code: string, name?: string }>).map(item => ({
    value: item.code,
    title: item.name ?? item.code.toUpperCase(),
  })),
)

// Label shown on the trigger button. In the inline header variant on the
// medium breakpoint we show the short code to stay compact, matching the
// previous v-select behaviour.
const currentLabel = computed(() => {
  const current = options.value.find(option => option.value === locale.value)
  const useShortLabel = !smAndDown.value && !lgAndUp.value
  if (!current)
    return locale.value.toUpperCase()
  return useShortLabel ? current.value.toUpperCase() : current.title
})

async function onSelect(value: string) {
  if (value !== locale.value) {
    await setLocale(value as 'ar' | 'fr')
  }
}
</script>

<template>
  <v-menu
    location="bottom"
    offset="4"
    transition="slide-y-transition"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="plain"
        density="compact"
        rounded="pill"
        :prepend-icon="block ? 'mdi-translate' : undefined"
        :aria-label="t('nav.language')"
        :class="['locale-switcher', 'text-body-2 mx-auto', block ? 'w-100' : 'locale-switcher--inline']"
      >
        {{ currentLabel }}
        <v-icon
          end
          size="16"
          icon="mdi-chevron-down"
        />
      </v-btn>
    </template>

    <v-list
      nav
      density="compact"
      rounded="lg"
      class="app-dropdown"
      min-width="160"
    >
      <v-list-item
        v-for="option in options"
        :key="option.value"
        rounded="lg"
        :active="option.value === locale"
        @click="onSelect(option.value)"
      >
        <v-list-item-title class="text-body-2 font-weight-medium">
          {{ option.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<style scoped>
.locale-switcher {
  text-transform: none;
  letter-spacing: 0;
}

/*
 * Inline (header) variant: size to its content with a small, responsive cap
 * so it stays compact on narrow viewports and never dominates the bar.
 */
.locale-switcher--inline {
  width: auto;
  min-width: 48px;
  max-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
}

@media (min-width: 1280px) {
  .locale-switcher--inline {
    max-width: 140px;
  }
}

.app-dropdown {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
  box-shadow:
    0 4px 6px rgb(0 0 0 / 0.06),
    0 12px 24px rgb(0 0 0 / 0.10) !important;
}
</style>
