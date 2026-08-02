/**
 * Canonical URL plus hreflang alternates for the current route.
 *
 * Without these, the Arabic page (/about) and the French page (/fr/about) look
 * like two competing copies of the same content to a search engine. The
 * canonical tag names the preferred URL, and the alternates say "this is the
 * same page in another language".
 *
 * Query strings are dropped on purpose: /articles?sort=recent must not be
 * indexed as a separate page from /articles.
 *
 * Must be called from a component's setup(), not from a plugin: useI18n() and
 * useSwitchLocalePath() both require an active setup context. app.vue calls it
 * once, and the tags update on their own as the route or locale changes.
 */
export function useSeoCanonical(): void {
  const route = useRoute()
  const { locale, locales } = useI18n()
  const switchLocalePath = useSwitchLocalePath()

  const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')

  function toAbsolute(path: string): string {
    return path === '/' ? `${siteUrl}/` : `${siteUrl}${path}`
  }

  const canonical = computed(() => toAbsolute(route.path))

  const alternates = computed(() =>
    locales.value.flatMap((item) => {
      if (typeof item === 'string') return []

      const path = switchLocalePath(item.code)
      if (!path) return []

      return [{
        rel: 'alternate' as const,
        hreflang: item.language || item.code,
        href: toAbsolute(path),
      }]
    }),
  )

  // Fallback for languages we do not publish: send them to Arabic.
  const defaultHref = computed(() => toAbsolute(switchLocalePath('ar') || '/'))

  useHead({
    link: () => [
      { rel: 'canonical' as const, href: canonical.value },
      ...alternates.value,
      { rel: 'alternate' as const, hreflang: 'x-default', href: defaultHref.value },
    ],
    meta: () => [
      { property: 'og:locale', content: locale.value === 'fr' ? 'fr_FR' : 'ar_DZ' },
    ],
  })
}
