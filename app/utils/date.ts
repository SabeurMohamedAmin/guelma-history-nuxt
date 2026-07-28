export function formatDate(date: Date | string, locale: 'ar' | 'fr' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Locale-aware date + time formatting (used for session/audit timestamps). */
export function formatDateTime(date: Date | string, locale: 'ar' | 'fr' = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(locale === 'ar' ? 'ar-DZ' : 'fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
