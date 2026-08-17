/** The two interface languages the admin supports. */
export type AppLocale = 'ar' | 'fr'

/**
 * Picks the text matching the interface language.
 *
 * Bilingual rows carry an Arabic and a French value, and a translation can be
 * missing or blank. The requested language wins; the other one is used as a
 * fallback so a list row is never empty. Returns an empty string only when
 * neither language holds any text, which lets the caller hide the label.
 */
export function pickLocalizedText(
  locale: AppLocale,
  arabic?: string | null,
  french?: string | null,
): string {
  const preferred = locale === 'ar' ? arabic : french
  const fallback = locale === 'ar' ? french : arabic

  return preferred?.trim() || fallback?.trim() || ''
}
