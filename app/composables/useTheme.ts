import { useTheme as useVuetifyTheme } from 'vuetify'

const THEME_COOKIE = 'guelma-theme'

/**
 * The persisted theme, defaulting to 'light' so SSR always renders a valid
 * value. Because of that default it is NEVER empty: use
 * useStoredThemePreference() when you need to know whether the visitor has
 * actually chosen a theme.
 */
export function useThemeCookie() {
  return useCookie<'light' | 'dark'>(THEME_COOKIE, {
    default: () => 'light',
    decode: value => (value === 'dark' ? 'dark' : 'light'),
    encode: value => value,
  })
}

/**
 * The same cookie WITHOUT a default, so `null` really means "no choice yet".
 * System dark-mode detection in plugins/auto-theme.client.ts depends on this
 * distinction and would otherwise never run.
 */
export function useStoredThemePreference() {
  return useCookie<'light' | 'dark' | null>(THEME_COOKIE, {
    default: () => null,
    decode: value => (value === 'dark' || value === 'light' ? value : null),
    encode: value => value ?? 'light',
  })
}

export const useTheme = () => {
  const vuetifyTheme = useVuetifyTheme()
  const themeCookie = useThemeCookie()

  // Read the current theme name reactively from the theme instance
  const isDark = computed(() => vuetifyTheme.global.current.value.dark)

  // Use the official .change() API — replaces deprecated .global.name.value =
  function toggleTheme() {
    // .toggle() defaults to toggling between 'light' and 'dark'
    vuetifyTheme.toggle()
    // Sync the cookie after the toggle so SSR / hydration picks it up
    themeCookie.value = isDark.value ? 'dark' : 'light'
  }

  // Expose a direct setter for cases where you need to set a specific theme
  // (e.g. reading the cookie on app boot and restoring the saved preference)
  function setTheme(name: 'light' | 'dark') {
    vuetifyTheme.change(name)
    themeCookie.value = name
  }

  return { isDark, toggleTheme, setTheme }
}
