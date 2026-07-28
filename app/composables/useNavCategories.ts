export interface NavCategory {
  /** i18n key used as a stable identity for the link */
  key: string
  title: string
  to: string
}

/**
 * Single source of truth for the primary category links.
 * Shared by the header navigation and the search overlay filters.
 */
export function useNavCategories() {
  const { t } = useI18n()
  const localePath = useLocalePath()

  const categories = computed<NavCategory[]>(() => [
    { key: 'sites', title: t('nav.sites'), to: localePath('/categories/sites-historiques') },
    { key: 'culture', title: t('nav.culture'), to: localePath('/categories/culture-patrimoine') },
    { key: 'events', title: t('nav.events'), to: localePath('/categories/evenements') },
    { key: 'people', title: t('nav.people'), to: localePath('/categories/personnalites') },
    { key: 'chronological', title: t('nav.chronological'), to: localePath('/timeline') },
  ])

  return { categories }
}
