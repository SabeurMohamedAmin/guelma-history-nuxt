// app/plugins/auto-theme.client.ts
// Detect system color-scheme preference, but only AFTER hydration to avoid
// an SSR mismatch (the server has no way to know the system preference, so it
// always renders the cookie value or the 'light' default).
export default defineNuxtPlugin((nuxtApp) => {
  const storedTheme = useStoredThemePreference()
  const themeCookie = useThemeCookie()

  nuxtApp.hook('app:mounted', () => {
    // Only auto-detect when the visitor has no persisted preference yet.
    // useThemeCookie() defaults to 'light', so it can never answer this.
    if (storedTheme.value) return

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = prefersDark ? 'dark' : 'light'
    themeCookie.value = theme

    // Apply reactively after hydration — this is a normal update, not a
    // hydration check, so it won't trigger a mismatch warning.
    // $vuetify is typed with a plain string theme name, but at runtime
    // theme.global.name is the reactive ref we need, so go through `unknown`.
    const vuetify = nuxtApp.vueApp.config.globalProperties.$vuetify as unknown as
      | { theme: { global: { name: { value: string } } } }
      | undefined

    if (vuetify?.theme?.global?.name) {
      vuetify.theme.global.name.value = theme
    }
  })
})
