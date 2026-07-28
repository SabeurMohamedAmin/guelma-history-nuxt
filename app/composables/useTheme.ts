import { useTheme as useVuetifyTheme } from 'vuetify'

export const useTheme = () => {
  const vuetifyTheme = useVuetifyTheme()
  const themeCookie = useCookie<'light' | 'dark'>('guelma-theme', {
    default: () => 'light',
  })

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
