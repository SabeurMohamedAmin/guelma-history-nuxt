import type { H3Event } from 'h3'

/**
 * Locale-aware redirect path builder for server routes (notably the OAuth
 * callbacks, which run after Facebook redirects back and therefore have no
 * Vue-side `localePath` available).
 *
 * The app uses i18n `strategy: 'prefix_except_default'` with `defaultLocale:
 * 'ar'`, so the default locale has NO prefix (`/` is Arabic) and every other
 * locale is prefixed (`/fr/...`). A server `sendRedirect(event, '/')` would
 * always land on Arabic, ignoring the visitor's chosen language.
 *
 * We recover the active locale from the `i18n_locale` cookie that
 * `detectBrowserLanguage` maintains (see `i18n.detectBrowserLanguage.cookieKey`
 * in nuxt.config.ts) and prefix the path only for non-default locales.
 */

const DEFAULT_LOCALE = 'ar'
const SUPPORTED_LOCALES = ['ar', 'fr'] as const
const LOCALE_COOKIE = 'i18n_locale'

/**
 * Prefix `path` with the visitor's active locale when it is a non-default,
 * supported locale. `path` must be an app-absolute path (starting with `/`),
 * e.g. `/register/complete` or `/login?error=facebook`.
 */
export function localizedPath(event: H3Event, path: string): string {
  const cookie = getCookie(event, LOCALE_COOKIE)
  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(cookie ?? '')
    ? (cookie as string)
    : DEFAULT_LOCALE

  if (locale === DEFAULT_LOCALE) return path

  // `/` -> `/fr`, `/register?x=y` -> `/fr/register?x=y`
  const normalized = path === '/' ? '' : path
  return `/${locale}${normalized}`
}
