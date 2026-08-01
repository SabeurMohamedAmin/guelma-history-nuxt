import type { authors } from '~~/server/db/schema/authors'

/**
 * A row as stored in the `authors` table (editorial byline, NOT a user account).
 */
type AuthorRow = typeof authors.$inferSelect

/** The active UI locale. Defaults to Arabic, the site's primary language. */
export type Locale = 'ar' | 'fr'

/**
 * The public, localized shape of an author. This is the ONLY author data ever
 * sent to visitors: it exposes the byline (name, bio, avatar, slug) and hides
 * everything internal (timestamps, the raw bilingual columns, ids of accounts).
 */
export interface PublicAuthor {
  id: string
  slug: string
  name: string
  bio: string | null
  avatar: string | null
}

/**
 * Pick the Arabic or French value for the active locale, falling back to the
 * other language when the preferred one is empty. This keeps the UI populated
 * even when an author has only filled in one language.
 */
function localized(ar: string | null, fr: string | null, locale: Locale): string | null {
  const preferred = locale === 'fr' ? fr : ar
  const fallback = locale === 'fr' ? ar : fr
  return preferred?.trim() || fallback?.trim() || null
}

/**
 * Map a raw author row to its public, localized representation.
 */
export function toPublicAuthor(author: AuthorRow, locale: Locale): PublicAuthor {
  return {
    id: author.id,
    slug: author.slug,
    name: localized(author.nameAr, author.nameFr, locale) ?? '',
    bio: localized(author.bioAr, author.bioFr, locale),
    avatar: author.avatar,
  }
}
