import posthog from 'posthog-js'
import { getPosthogPageUrl, sanitizePosthogEvent } from '../utils/posthog'
import type { PosthogEvent } from '../utils/posthog'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public
  const key = String(config.posthogKey || '').trim()
  // Prefer the configured endpoint, falling back to PostHog's official EU host.
  // The custom t.guelmahistory.com proxy previously returned HTTP 403.
  const host = String(config.posthogHost || 'https://eu.i.posthog.com').trim()
  const privacyPreferences = navigator as Navigator & { globalPrivacyControl?: boolean }

  if (!key) {
    console.warn('[PostHog] Analytics disabled: NUXT_PUBLIC_POSTHOG_KEY is missing.')
    return
  }

  // Respect browser privacy signals. If a key is configured, allow local preview
  // and development to initialize too, so analytics can be tested before deploy.
  if (navigator.doNotTrack === '1' || privacyPreferences.globalPrivacyControl) return

  const router = useRouter()
  let lastPath: string | undefined
  let initialized = false

  function capturePageView() {
    if (!initialized) return

    const url = getPosthogPageUrl(router.currentRoute.value.fullPath, window.location.origin)
    if (!url) {
      lastPath = undefined
      return
    }
    if (url.pathname === lastPath) return

    try {
      posthog.capture('$pageview', { $current_url: url.href })
      lastPath = url.pathname
    }
    catch {
      // Analytics must never prevent navigation or page rendering.
      console.warn('[PostHog] Could not capture a page view')
    }
  }

  const removeNavigationHook = router.afterEach((_to, _from, failure) => {
    if (!failure) capturePageView()
  })

  // Initialize immediately, following the working CTS tracker integration.
  // The SDK is bundled locally; this does not inject an external script tag.
  try {
    posthog.init(key, {
      api_host: host,
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_decide: true,
      respect_dnt: true,
      ip: false,
      before_send: event => sanitizePosthogEvent(event as PosthogEvent | null, window.location.origin) as typeof event,
      loaded: () => {
        initialized = true
        capturePageView()
      },
    })
  }
  catch (error) {
    console.error('[PostHog] Analytics could not initialize', error)
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(removeNavigationHook)
  }
})
