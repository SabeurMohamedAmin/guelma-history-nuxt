<script setup lang="ts">
// The boot overlay is purely cosmetic, so the page itself must always be
// rendered. Hiding <NuxtLayout> behind the loading flag used to send an empty
// page to search engines, because the timer that clears the flag only runs in
// the browser. Now the layout is always in the HTML and the loader simply sits
// on top of it for a moment.
const INITIAL_LOADING_DELAY_MS = 150

// Starts false on the server: no overlay markup is sent to crawlers.
const loading = ref(false)
let loadingTimer: ReturnType<typeof setTimeout> | null = null

const { locale, locales } = useI18n()

// Language and direction belong on <html> for search engines and for RTL.
const currentLocale = computed(() =>
  locales.value.find(item => typeof item !== 'string' && item.code === locale.value),
)

// AdSense site verification.
//
// The AdSense crawler does not run client-side JavaScript, so BOTH markers it
// looks for must be in the server-rendered <head>: the meta tag and the
// adsbygoogle.js snippet. The script is `async`, so it does not block the page.
const { adsenseClient, scriptUrl } = useAdsense()

// Site-wide title template plus a fallback title.
//
// `titleTemplate` appends the brand to every page title, and `title` is the
// default used when a page sets none. Without this fallback, any page that
// forgets useHead({ title }) renders an empty <title>, which is what Search
// Console reported. Pages keep full control: their own title replaces %s.
const { t } = useI18n()

useHead({
  titleTemplate: title => (title ? `${title} | ${t('common.siteName')}` : t('seo.defaultTitle')),
  title: () => t('seo.defaultTitle'),
  htmlAttrs: {
    lang: () => (typeof currentLocale.value === 'object' && currentLocale.value?.language) || locale.value,
    dir: () => (typeof currentLocale.value === 'object' && currentLocale.value?.dir) || 'ltr',
  },
  meta: adsenseClient
    ? [{ name: 'google-adsense-account', content: adsenseClient }]
    : [],
  // No preconnect to fundingchoicesmessages.google.com: the consent frame is
  // requested seconds after load (once adsbygoogle.js runs), long after the
  // early connection has been closed, so Lighthouse flags it as unused.
  script: adsenseClient
    ? [
        { src: scriptUrl, async: true, crossorigin: 'anonymous' },
        { src: 'https://www.googletagmanager.com/gtag/js?id=G-5JMC9NREV8', async: true },
        { innerHTML: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5JMC9NREV8');
          ` },
      ]
    : [],
})

// Canonical + hreflang for every route (setup context required).
useSeoCanonical()

onMounted(() => {
  loading.value = true
  loadingTimer = setTimeout(() => {
    loading.value = false
  }, INITIAL_LOADING_DELAY_MS)
})

onBeforeUnmount(() => {
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }
})
</script>

<template>
  <NuxtLayout class="general-width">
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator color="primary" />
    <NuxtPage />
  </NuxtLayout>

  <ClientOnly>
    <LayoutAppLoader
      v-model="loading"
      class="general-width"
    />
  </ClientOnly>
</template>

<style>
.general-width {
  min-width: 350px !important;
  max-width: 1200px !important;
  margin: 0 auto !important;
}
</style>
