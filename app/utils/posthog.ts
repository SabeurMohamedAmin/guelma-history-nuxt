export interface PosthogEvent {
  event: string
  properties: Record<string, unknown>
  [key: string]: unknown
}

// Only public reading pages are measured. Account and token-bearing routes
// are excluded, including their French variants.
const excludedPaths = /^\/(?:fr\/)?(?:admin|author|profile|reading-list|login|register|verify-email|forgot-password|reset-password|search|newsletter|contact)(?:\/|$)/

export function getPosthogPageUrl(value: string, origin: string): URL | null {
  try {
    const url = new URL(value, origin)
    if (url.origin !== origin || excludedPaths.test(decodeURIComponent(url.pathname))) return null

    url.search = ''
    url.hash = ''
    return url
  }
  catch {
    return null
  }
}

// Use an allowlist so automatically attached referrers, campaign parameters,
// page titles and future SDK properties cannot leak private URL values.
export function sanitizePosthogEvent(event: PosthogEvent | null, origin: string): PosthogEvent | null {
  if (!event || event.event !== '$pageview') return null

  const currentUrl = event.properties.$current_url
  if (typeof currentUrl !== 'string') return null

  const url = getPosthogPageUrl(currentUrl, origin)
  if (!url) return null

  return {
    ...event,
    properties: {
      distinct_id: event.properties.distinct_id,
      $current_url: url.href,
      $pathname: url.pathname,
      $host: url.host,
      $lib: event.properties.$lib,
      $lib_version: event.properties.$lib_version,
      $process_person_profile: false,
      $geoip_disable: true,
    },
  }
}
