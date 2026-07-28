/**
 * Generate a URL-safe slug from a Latin (French) title string.
 *
 * Arabic is not URL-safe in slugs because it requires percent-encoding and
 * doesn't sort or display well in browser address bars. Pass the French title
 * when creating slugs for articles that have both language variants.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD') // decompose accented chars
    .replace(/[\u0300-\u036F]/g, '') // strip combining diacritics (é → e)
    .replace(/[^a-z0-9\s-]/g, '') // keep only ASCII alphanumeric + spaces/hyphens
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
}
