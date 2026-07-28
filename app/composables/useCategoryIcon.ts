/**
 * Maps category slugs to Material Design Icons.
 *
 * The `Category` type carries no `icon` field, so the mapping lives here as the
 * single source of truth. Reuse this composable anywhere a category needs an
 * icon (grid, filter, badges) instead of duplicating the map.
 *
 * To add a new category icon, add an entry to `ICON_BY_SLUG`. Unknown slugs
 * fall back to `DEFAULT_ICON`.
 */
const ICON_BY_SLUG: Record<string, string> = {
  'sites-historiques': 'mdi-castle',
  'culture-patrimoine': 'mdi-palette',
  'evenements': 'mdi-calendar-star',
  'personnalites': 'mdi-account-group',
}

const DEFAULT_ICON = 'mdi-tag'

export function useCategoryIcon() {
  function getCategoryIcon(slug: string): string {
    return ICON_BY_SLUG[slug] ?? DEFAULT_ICON
  }

  return { getCategoryIcon }
}
