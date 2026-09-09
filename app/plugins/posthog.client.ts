import { getPosthogPageUrl, sanitizePosthogEvent } from '../utils/posthog'
import type { PosthogEvent } from '../utils/posthog'

interface PosthogClient {
  init: (key: string, options: Record<string, unknown>) => void
  capture: (event: string, properties: Record<string, unknown>) => void
}

declare global {
  interface Window {
    posthog?: PosthogClient
  }
}

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
  let client: PosthogClient | undefined
  let lastPath: string | undefined

  function capturePageView() {
    if (!client) return

    const url = getPosthogPageUrl(router.currentRoute.value.fullPath, window.location.origin)
    if (!url) {
      lastPath = undefined
      return
    }
    if (url.pathname === lastPath) return

    try {
      client.capture('$pageview', { $current_url: url.href })
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

  // Load the browser SDK asynchronously after hydration, like the site's
  // other third-party scripts. No server import or package lock change needed.
  nuxtApp.hook('app:mounted', () => {
    const script = document.createElement('script')
    script.src = 'https://eu-assets.i.posthog.com/static/array.js'
    script.async = true
    script.referrerPolicy = 'no-referrer'
    script.onload = () => {
      try {
        window.posthog?.init(key, {
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
          loaded: (posthog: PosthogClient) => {
            client = posthog
            // Read the current route now, not the route before the download.
            capturePageView()
          },
        })
      }
      catch {
        console.warn('[PostHog] Analytics could not initialize')
      }
    }
    script.onerror = () => {
      console.warn('[PostHog] Analytics SDK could not load')
    }
    document.head.appendChild(script)
  })

  if (import.meta.hot) {
    import.meta.hot.dispose(removeNavigationHook)
  }
})
