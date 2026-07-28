// app/plugins/dir.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n as { locale: Ref<string> }

  watch(
    () => i18n.locale.value,
    (newLocale) => {
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr'
    },
    { immediate: true },
  )
})
