/**
 * Validation rules for the article editor.
 *
 * They live in a composable rather than in the Pinia store so the messages are
 * translated with the interface language. Use them straight in a field:
 * `:rules="[required]"`.
 */
export function useArticleFormRules() {
  const { t } = useI18n()

  /** The field must hold something; spaces only does not count. */
  function required(value: unknown): true | string {
    const filled = typeof value === 'string'
      ? value.trim().length > 0
      : value !== null && value !== undefined && value !== ''

    if (!filled) return t('articleForm.validation.required')
    return true
  }

  /** A slug may only contain lowercase letters, numbers and hyphens. */
  function slugFormat(value: string): true | string {
    if (value && !/^[a-z0-9-]+$/.test(value)) return t('articleForm.validation.slug')
    return true
  }

  return { required, slugFormat }
}
