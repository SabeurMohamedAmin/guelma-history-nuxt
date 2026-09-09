import { describe, expect, it } from 'vitest'
import { getPosthogPageUrl, sanitizePosthogEvent } from '../../../app/utils/posthog'

const origin = 'https://guelmahistory.com'

describe('PostHog page URLs', () => {
  it('removes queries and fragments from public pages', () => {
    expect(getPosthogPageUrl('/fr/articles/history?email=reader@example.com#section', origin)?.href)
      .toBe(`${origin}/fr/articles/history`)
  })

  it.each([
    '/admin', '/admin/articles', '/fr/admin/articles', '/author/articles',
    '/profile', '/reading-list', '/login', '/register', '/verify-email?token=secret',
    '/forgot-password', '/reset-password', '/search?q=private',
    '/newsletter/confirm?token=secret', '/fr/contact', '/%61dmin/articles',
    '//another-site.example/article', '/invalid%escape',
  ])('excludes private, external or invalid URLs: %s', (path) => {
    expect(getPosthogPageUrl(path, origin)).toBeNull()
  })

  it.each(['/', '/fr', '/fr/', '/articles/history', '/authors/historian', '/categories/history'])('allows public pages: %s', (path) => {
    expect(getPosthogPageUrl(path, origin)?.pathname).toBe(path)
  })
})

describe('PostHog event sanitization', () => {
  it('keeps only approved page-view properties', () => {
    const result = sanitizePosthogEvent({
      event: '$pageview',
      properties: {
        distinct_id: 'temporary-visitor',
        $current_url: `${origin}/articles/history?token=secret#private`,
        $referrer: 'https://example.com/?email=private',
        $initial_current_url: `${origin}/login?token=secret`,
        $session_id: 'session',
        email: 'private@example.com',
        $lib: 'web',
        $lib_version: 'test',
      },
    }, origin)

    expect(result?.properties).toEqual({
      distinct_id: 'temporary-visitor',
      $current_url: `${origin}/articles/history`,
      $pathname: '/articles/history',
      $host: 'guelmahistory.com',
      $lib: 'web',
      $lib_version: 'test',
      $process_person_profile: false,
      $geoip_disable: true,
    })
  })

  it('drops non-pageview events and private pages', () => {
    expect(sanitizePosthogEvent(null, origin)).toBeNull()
    expect(sanitizePosthogEvent({ event: '$autocapture', properties: {} }, origin)).toBeNull()
    expect(sanitizePosthogEvent({ event: '$pageview', properties: {} }, origin)).toBeNull()
    expect(sanitizePosthogEvent({ event: '$pageview', properties: { $current_url: `${origin}/admin` } }, origin)).toBeNull()
  })
})
