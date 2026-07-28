// Google AdSense helper.
//
// IMPORTANT: the AdSense crawler does not execute our client-side JavaScript.
// So the official snippet has to be present in the server-rendered <head>
// (see app.vue). Injecting it from the browser, as this file used to do, means
// site verification and ad serving both see a page with no AdSense code.
//
// The tag is `async`, so it never blocks rendering. Only the ad REQUEST stays
// lazy: <AdUnit> waits until a slot is close to the viewport before pushing it
// to the queue below.

declare global {
  interface Window {
    // Queue read by adsbygoogle.js. Pushing an object asks Google to fill the
    // next <ins class="adsbygoogle"> found in the page.
    adsbygoogle?: Record<string, unknown>[]
  }
}

const ADSENSE_SCRIPT_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

export function useAdsense() {
  const config = useRuntimeConfig().public

  // Publisher id, e.g. "ca-pub-1234567890". Empty means ads are disabled.
  const adsenseClient = String(config.adsenseClient || '')

  // Slot ids created in the AdSense dashboard, one per placement.
  const adsenseSlots = config.adsenseSlots

  // Exactly the URL the dashboard snippet uses, publisher id included.
  const scriptUrl = `${ADSENSE_SCRIPT_URL}?client=${adsenseClient}`

  // Asks AdSense to fill the <ins> elements already in the DOM.
  //
  // Safe to call before adsbygoogle.js has finished downloading: the global is
  // a plain array that the script drains once it starts.
  function requestAd(): void {
    if (!import.meta.client || !adsenseClient) return

    window.adsbygoogle = window.adsbygoogle || []
    window.adsbygoogle.push({})
  }

  return { adsenseClient, adsenseSlots, scriptUrl, requestAd }
}
