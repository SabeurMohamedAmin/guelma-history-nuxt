/**
 * GET /robots.txt
 *
 * Generated instead of served from public/, so the Sitemap line always points
 * at the current domain (taken from NUXT_PUBLIC_SITE_URL) and so staging
 * deployments can be closed to crawlers with a single env var.
 */

// Private or low-value areas. Keeping them out of the index avoids wasting
// crawl budget and prevents login screens from showing up in search results.
const DISALLOWED_PATHS = [
  '/admin',
  '/author',
  '/profile',
  '/reading-list',
  '/login',
  '/register',
  '/verify-email',
  '/search',
  '/api/',
  // WebSocket endpoints (realtime comments and notifications). They only speak
  // the upgrade handshake, so a plain crawler GET is answered with an error.
  '/_ws',
]

// Google's advertising crawlers. They must always reach every page: AdSense
// site verification and ad targeting both fail when they are blocked, and
// neither of them adds anything to the search index.
const AD_CRAWLERS = [
  'Mediapartners-Google',
  'AdsBot-Google',
  'AdsBot-Google-Mobile',
]

export default defineEventHandler((event) => {
  const config = useRuntimeConfig().public
  const siteUrl = String(config.siteUrl || '').replace(/\/$/, '')

  // Search indexing is enabled everywhere except local development, unless a
  // deployment opts out with NUXT_PUBLIC_DISABLE_INDEXING=true.
  //
  // This is deliberately NOT derived from siteUrl any more: a production deploy
  // that forgot NUXT_PUBLIC_SITE_URL fell back to "localhost", which served
  // "Disallow: /" to every crawler on the live site.
  const indexingEnabled = !import.meta.dev && !config.disableIndexing

  const adCrawlerLines = AD_CRAWLERS.flatMap(name => [
    `User-agent: ${name}`,
    'Allow: /',
    '',
  ])

  const lines = [
    ...adCrawlerLines,
    'User-agent: *',
    ...(indexingEnabled
      // Both the default (Arabic) and the /fr prefixed variants.
      ? DISALLOWED_PATHS.flatMap(path => [`Disallow: ${path}`, `Disallow: /fr${path}`])
      : ['Disallow: /']),
  ]

  // Only advertise a sitemap once the real domain is configured.
  if (indexingEnabled && siteUrl && !siteUrl.includes('localhost')) {
    lines.push('', `Sitemap: ${siteUrl}/sitemap.xml`)
  }

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return `${lines.join('\n')}\n`
})
