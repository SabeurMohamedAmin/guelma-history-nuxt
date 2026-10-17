import posthog from 'posthog-js'
import { sanitizePosthogEvent } from '../utils/posthog'
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

  // Use the same proven history-change capture mode as the CTS tracker. The SDK
  // owns initial and client-side pageview timing; before_send still strips query
  // strings, fragments, private routes, and every unapproved event/property.
  try {
    posthog.init(key, {
      api_host: host,
      ui_host: 'https://eu.posthog.com',
      persistence: 'memory',
      person_profiles: 'never',
      autocapture: false,
      capture_pageview: 'history_change',
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      respect_dnt: true,
      ip: false,
      before_send: event => sanitizePosthogEvent(event as PosthogEvent | null, window.location.origin) as typeof event,
    })
  }
  catch (error) {
    console.error('[PostHog] Analytics could not initialize', error)
  }
})
