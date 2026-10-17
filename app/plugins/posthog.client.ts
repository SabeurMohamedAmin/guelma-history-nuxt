import posthog from 'posthog-js'
import { getPosthogPageUrl, sanitizePosthogEvent } from '../utils/posthog'
import type { PosthogEvent } from '../utils/posthog'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const key = String(config.posthogKey || '').trim()
  const host = String(config.posthogHost || 'https://eu.i.posthog.com').trim()
  const privacyPreferences = navigator as Navigator & { globalPrivacyControl?: boolean }

  if (!key) {
    console.warn('[PostHog] Analytics disabled: NUXT_PUBLIC_POSTHOG_KEY is missing.')
    return
  }

  // Respect browser privacy signals.
  if (navigator.doNotTrack === '1' || privacyPreferences.globalPrivacyControl) return

  // Capture pageviews explicitly. This avoids relying on SDK history listeners
  // for Nuxt's initial SSR page and client-side route transitions.
  const router = useRouter()

  try {
    posthog.init(key, {
      api_host: host,
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      // Send each approved event immediately instead of waiting for the
      // SDK's batch timer/beacon transport. This makes delivery more reliable
      // on short visits and avoids depending on /batch/ transport behavior.
      request_batching: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      respect_dnt: true,
      ip: false,
      before_send: (event) => {
        const sanitized = sanitizePosthogEvent(
          event as PosthogEvent | null,
          window.location.origin,
        )

        // Returning null is the SDK's supported way to drop an event.
        return sanitized as typeof event
      },
      loaded: (client) => {
        let lastPageUrl = ''

        const capturePageview = (href: string) => {
          const safeUrl = getPosthogPageUrl(href, window.location.origin)
          if (!safeUrl || safeUrl.href === lastPageUrl) return

          lastPageUrl = safeUrl.href
          client.capture('$pageview', { $current_url: safeUrl.href })
        }

        // Use Nuxt's resolved route rather than window.location: i18n can
        // redirect from `/` to `/fr` while the SDK is initializing.
        capturePageview(new URL(router.currentRoute.value.fullPath, window.location.origin).href)

        router.afterEach((to, _from, failure) => {
          if (failure) return
          capturePageview(new URL(to.fullPath, window.location.origin).href)
        })
      },
    })
  }
  catch (error) {
    console.error('[PostHog] Analytics could not initialize', error)
  }
})
