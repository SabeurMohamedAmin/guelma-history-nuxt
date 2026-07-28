/**
 * GET /ads.txt
 *
 * Authorized Digital Sellers file. Google AdSense checks it at the root of the
 * domain to confirm that we are allowed to sell ad space on this site.
 *
 * Generated instead of served from public/, so the publisher id comes from the
 * same env var as the ad units (NUXT_PUBLIC_ADSENSE_CLIENT) and never drifts.
 */

// Fixed id of Google's ad system, identical for every AdSense publisher.
const GOOGLE_CERTIFICATION_AUTHORITY_ID = 'f08c47fec0942fa0'

export default defineEventHandler((event) => {
  // The dashboard gives "ca-pub-1234", ads.txt expects "pub-1234".
  const publisherId = String(useRuntimeConfig().public.adsenseClient || '').replace(/^ca-/, '')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  // No publisher id configured (development): return an empty file rather than
  // a broken line, so Google reads it as "nothing declared".
  if (!publisherId) {
    return ''
  }

  return `google.com, ${publisherId}, DIRECT, ${GOOGLE_CERTIFICATION_AUTHORITY_ID}\n`
})
