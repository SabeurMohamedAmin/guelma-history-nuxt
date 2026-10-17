import posthog from 'posthog-js'
import { getPosthogPageUrl, sanitizePosthogEvent } from '../utils/posthog'
import type { PosthogEvent } from '../utils/posthog'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const key = String(config.posthogKey || '').trim()
  const host = String(config.posthogHost || '').replace(/\/+$/, '')
  const privacyPreferences = navigator as Navigator & { globalPrivacyControl?: boolean }

  // Keep local development and visitors requesting privacy out of analytics.
  if (import.meta.dev || !key || navigator.doNotTrack === '1' || privacyPreferences.globalPrivacyControl) return

  // This integration deliberately uses only PostHog's EU infrastructure.
  if (host !== 'https://eu.i.posthog.com') {
    console.warn('[PostHog] Expected NUXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com')
    return
  }

  const router = useRouter()
  let lastPath: string | undefined

  function capturePageView() {
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

  // Initialize the installed SDK after hydration. Bundling it with the client
  // avoids relying on a dynamically injected third-party script that can be
  // blocked by CSP or browser privacy protections before it reports an error.
  nuxtApp.hook('app:mounted', () => {
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
        before_send: (event: PosthogEvent | null) => sanitizePosthogEvent(event, window.location.origin),
        loaded: () => {
          // Read the current route after SDK initialization, not before it.
          capturePageView()
        },
      })
    }
    catch {
      console.warn('[PostHog] Analytics could not initialize')
    }
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(removeNavigationHook)
  }
})
