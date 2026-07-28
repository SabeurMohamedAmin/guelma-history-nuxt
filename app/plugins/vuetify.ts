import { h } from 'vue'
import { createVuetify } from 'vuetify'
import type { IconProps, IconSet } from 'vuetify'
import { aliases } from 'vuetify/iconsets/mdi'
import { ar, fr } from 'vuetify/locale'
import 'vuetify/styles'
import { Icon } from '#components'

/**
 * SVG icon set backed by @nuxt/icon (icons bundled from @iconify-json/mdi).
 *
 * Vuetify resolves its aliases BEFORE calling this component, so `props.icon`
 * is always a concrete name like "mdi-account"; we map it to Iconify's
 * "mdi:account" and render an inline SVG that inherits the current font size
 * and color, exactly like the old font glyph did.
 *
 * This replaces the Material Design Icons WEBFONT (~360 KiB + its CSS): no
 * font download, no font-display flash of invisible icons on first paint.
 */
const nuxtIconSet: IconSet = {
  component: (props: IconProps) =>
    h(Icon, { name: `mdi:${String(props.icon).replace(/^mdi-/, '')}` }),
}

export default defineNuxtPlugin((nuxtApp) => {
  const themeCookie = useCookie('guelma-theme')
  const i18n = nuxtApp.$i18n as {
    locale: { value: string }
    locales: { value: Array<{ code: string, dir: string }> }
  }

  const rtlDictionary: Record<string, boolean> = {}
  for (const l of i18n.locales.value as Array<{ code: string, dir: string }>) {
    rtlDictionary[l.code] = l.dir === 'rtl'
  }

  const vuetify = createVuetify({
    ssr: true,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi: nuxtIconSet },
    },
    theme: {
      defaultTheme: themeCookie.value ?? 'light',
      themes: {
        light: {
          colors: {
            primary: '#8B6914',
            secondary: '#5C4A1E',
            accent: '#C9A227',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: '#C9A227',
            secondary: '#8B6914',
            accent: '#E8D48B',
          },
        },
      },
    },
    locale: {
      messages: { ar, fr },
      locale: i18n.locale.value,
      fallback: 'ar',
      rtl: rtlDictionary,
    },
  })

  nuxtApp.vueApp.use(vuetify)

  if (import.meta.client) {
    watch(
      () => i18n.locale.value as string,
      (newLocale: string) => {
        vuetify.locale.current.value = newLocale
        const isRtl = rtlDictionary[newLocale] ?? false
        document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
        document.documentElement.setAttribute('lang', newLocale)
      },
      { immediate: true },
    )
  }
})
