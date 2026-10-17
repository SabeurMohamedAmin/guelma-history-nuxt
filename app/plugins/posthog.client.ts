import posthog from 'posthog-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const key = String(config.public.posthogKey || '').trim()
  const host = String(config.public.posthogHost || '').trim()

  if (!key) {
    console.warn(
      '[PostHog] Analytics disabled: NUXT_PUBLIC_POSTHOG_KEY is missing.',
    )
    return
  }

  posthog.init(key, {
    api_host: host || 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    capture_pageview: 'history_change',
    capture_pageleave: true,
  })

  return {
    provide: {
      posthog,
    },
  }
})
