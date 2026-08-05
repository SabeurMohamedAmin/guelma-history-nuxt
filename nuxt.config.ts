import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

// Private and low-value pages kept out of search engine indexes.
// robots.txt asks crawlers not to visit; the per-route "noindex" header (see
// routeRules below) is the guarantee for URLs discovered another way (a shared
// link, a backlink). Every path is also covered in its French ("/fr/...") variant.
const noIndexPages = [
  '/admin/**',
  '/author/**',
  '/profile/**',
  '/reading-list',
  '/login',
  '/register/**',
  '/verify-email',
  '/search',
]

export default defineNuxtConfig({
  /* ------------------------------------------------------------------ */
  /* Core                                                                */
  /* ------------------------------------------------------------------ */

  modules: [
    'nuxt-gtag',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    'nuxt-security',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    'nuxt-auth-utils',
    '@nuxt/test-utils',
    '@nuxtjs/cloudinary',
  ],
  devtools: { enabled: true },

  /* ------------------------------------------------------------------ */
  /* App                                                                 */
  /* ------------------------------------------------------------------ */
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  css: ['~/assets/css/main.css'],

  /* ------------------------------------------------------------------ */
  /* Runtime config                                                      */
  /* ------------------------------------------------------------------ */
  // Server-only keys are overridden via NUXT_* env vars.
  // Emails are sent via the `resend` SDK through
  // server/utils/email/resend-config.ts (useResend()), which reads
  // NUXT_RESEND_API_KEY from the environment.
  runtimeConfig: {
    resendFromEmail: 'Guelma History <onboarding@resend.dev>',

    // nuxt-auth-utils sealed web session. The password remains server-only and
    // is supplied through NUXT_SESSION_PASSWORD. Secure is disabled only for
    // local HTTP development; production cookies require HTTPS.
    session: {
      // Empty only as a repository-safe default. Production and development
      // must provide NUXT_SESSION_PASSWORD through the environment.
      password: '',
      cookie: {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
    },

    // Flutter admin authentication. These values are server-only and must
    // never be moved into runtimeConfig.public.
    mobileAuth: {
      signingKey: '',
      // Temporary fallback for zero-downtime key rotation. Set the old key via
      // NUXT_MOBILE_AUTH_PREVIOUS_SIGNING_KEY, then remove it after the access
      // token TTL has elapsed. New tokens are always signed by signingKey.
      previousSigningKey: '',
      issuer: 'guelma-history-api',
      audience: 'guelma-history-flutter-admin',
      accessTokenTtlSeconds: 15 * 60,
      refreshTokenTtlDays: 30,
      maxActiveDevices: 5,
    },

    // Facebook OAuth credentials. Read automatically by nuxt-auth-utils'
    // defineOAuthFacebookEventHandler. Set via NUXT_OAUTH_FACEBOOK_CLIENT_ID
    // and NUXT_OAUTH_FACEBOOK_CLIENT_SECRET.
    oauth: {
      facebook: {
        clientId: '',
        clientSecret: '',
      },
    },

    // Destination inbox for verified contact messages
    // (override via NUXT_CONTACT_OWNER_EMAIL).
    contactOwnerEmail: '',

    // Image & video storage cloud (override via NUXT_CLOUDINARY_* env vars).
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',

    public: {
      // Public base URL used to build links inside emails.
      siteUrl: 'http://localhost:3000',

      // Cloudinary cloud name is public (it appears in delivery URLs) and is
      // used by @nuxtjs/cloudinary on the client to build CldImage/Video URLs.
      cloudinaryCloudName: process.env.NUXT_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,

      // How many levels comment replies indent before showing the "continue
      // this thread" re-root link. Override via
      // NUXT_PUBLIC_COMMENTS_MAX_INDENT; falls back to 5.
      commentsMaxIndent: Number(process.env.NUXT_PUBLIC_COMMENTS_MAX_INDENT) || 5,

      // Google AdSense publisher id (ca-pub-...). When empty, <AdUnit> renders
      // nothing and adsbygoogle.js is never downloaded.
      adsenseClient: process.env.NUXT_PUBLIC_ADSENSE_CLIENT || '',

      // Ad slot ids created in the AdSense dashboard, one per placement.
      // Nuxt builds the runtime env name from the FULL key path, so this
      // nested value is overridden by NUXT_PUBLIC_ADSENSE_SLOTS_SIDEBAR
      // (plural "SLOTS"). The old singular name is still read as a fallback.
      adsenseSlots: {
        sidebar: process.env.NUXT_PUBLIC_ADSENSE_SLOTS_SIDEBAR
          || process.env.NUXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
          || '',
      },

      // Set NUXT_PUBLIC_DISABLE_INDEXING=true on preview/staging deployments
      // to serve a "Disallow: /" robots.txt. Never set it in production.
      disableIndexing: process.env.NUXT_PUBLIC_DISABLE_INDEXING === 'true',
    },
  },

  /* ------------------------------------------------------------------ */
  /* Build / Vite (Vuetify integration)                                  */
  /* ------------------------------------------------------------------ */
  build: {
    transpile: ['vuetify'],
  },

  /* ------------------------------------------------------------------ */
  /* Route rules                                                         */
  /* ------------------------------------------------------------------ */
  routeRules: {
    // Keep private pages out of Google's index (see noIndexPages above).
    ...Object.fromEntries(
      noIndexPages.flatMap(path => [
        [path, { robots: 'noindex, nofollow' }],
        [`/fr${path}`, { robots: 'noindex, nofollow' }],
      ]),
    ),

    // Google fetches these two files with plain, un-throttled requests, often
    // several times in a row. A single 429 from the global rate limiter is
    // enough to fail AdSense site verification, so both opt out of it and are
    // cached for an hour instead.
    '/ads.txt': {
      security: { rateLimiter: false },
      headers: { 'cache-control': 'public, max-age=3600' },
    },
    '/robots.txt': {
      security: { rateLimiter: false },
      headers: { 'cache-control': 'public, max-age=3600' },
    },

    // Optimized images served by @nuxt/image's IPX endpoint. The URL encodes
    // the source image AND every modifier (size, format, quality), so any
    // change produces a brand-new URL. That makes the response effectively
    // immutable: cache it for a year.
    '/_ipx/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },

    // Build assets (JS/CSS/fonts) in /_nuxt/ are content-hashed: any code
    // change produces a brand-new URL, so they are safe to cache forever.
    // Without this rule nuxt-security's default "no-store" wins and every
    // repeat visit re-downloads the whole CSS/JS bundle.
    '/_nuxt/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    },

    // Static files in public/ (logos, favicons). NOT content-hashed, so a
    // replaced file keeps its URL: cache for 30 days and let the browser
    // serve the stale copy while it revalidates in the background.
    '/img/**': {
      headers: { 'cache-control': 'public, max-age=2592000, stale-while-revalidate=86400' },
    },

    // Strict rate limit on the sensitive auth routes (max 10 requests / 5 min
    // per IP) to slow brute-force and credential-stuffing attacks.
    '/api/auth/**': {
      headers: {
        'cache-control': 'private, no-store',
        'pragma': 'no-cache',
      },
      security: {
        rateLimiter: {
          tokensPerInterval: 10,
          interval: 300000,
        },
      },
    },
    // Flutter credentials and refresh tokens receive the same strict limit.
    '/api/v1/admin/auth/**': {
      headers: {
        'cache-control': 'private, no-store',
        'pragma': 'no-cache',
      },
      security: {
        rateLimiter: {
          tokensPerInterval: 10,
          interval: 300000,
        },
      },
    },

    // All administrator API responses may contain drafts or personal data.
    '/api/admin/**': {
      headers: {
        'cache-control': 'private, no-store',
        'pragma': 'no-cache',
      },
    },
    '/api/author/**': {
      headers: {
        'cache-control': 'private, no-store',
        'pragma': 'no-cache',
      },
    },

    // The admin avatar endpoint sets its own long-lived Cache-Control header,
    // so it needs no route rule here.

    // Article gallery media (images/videos) is uploaded to Cloudinary through
    // this endpoint. nuxt-security's default request size limit (2MB body /
    // 8MB total) resets the connection on larger videos, so raise it here to
    // ~110MB to match the endpoint's own 100MB cap plus multipart overhead.
    '/api/admin/articles/media/upload': {
      security: {
        requestSizeLimiter: {
          maxRequestSizeInBytes: 110_000_000,
          maxUploadFileRequestInBytes: 110_000_000,
        },
      },
    },
    // Autosave is intentionally more permissive than authentication while
    // still bounded to prevent a broken or hostile client from flooding writes.
    '/api/v1/admin/articles/*/autosave': {
      security: {
        rateLimiter: { tokensPerInterval: 120, interval: 300000 },
        requestSizeLimiter: {
          maxRequestSizeInBytes: 2_100_000,
          maxUploadFileRequestInBytes: 0,
        },
      },
    },
    '/api/v1/admin/articles/media/upload': {
      security: {
        rateLimiter: { tokensPerInterval: 10, interval: 300000 },
        requestSizeLimiter: {
          maxRequestSizeInBytes: 110_000_000,
          maxUploadFileRequestInBytes: 110_000_000,
        },
      },
    },
    '/api/admin/profile/avatar': {
      security: {
        rateLimiter: { tokensPerInterval: 10, interval: 300000 },
        requestSizeLimiter: {
          maxRequestSizeInBytes: 21_000_000,
          maxUploadFileRequestInBytes: 21_000_000,
        },
      },
    },
    '/api/v1/admin/profile/avatar': {
      security: {
        rateLimiter: { tokensPerInterval: 10, interval: 300000 },
        requestSizeLimiter: {
          maxRequestSizeInBytes: 21_000_000,
          maxUploadFileRequestInBytes: 21_000_000,
        },
      },
    },
    '/api/contact/submit': {
      security: {
        rateLimiter: { tokensPerInterval: 5, interval: 300000 },
        requestSizeLimiter: {
          maxRequestSizeInBytes: 55_000_000,
          maxUploadFileRequestInBytes: 55_000_000,
        },
      },
    },
  }, compatibilityDate: '2025-07-15',

  /* ------------------------------------------------------------------ */
  /* Nitro (server engine)                                               */
  /* ------------------------------------------------------------------ */
  nitro: {
    preset: 'node-server',

    // Native WebSocket support, used by the realtime comments channel in
    // server/routes/_ws/. Required for defineWebSocketHandler and the
    // crossws peer pub/sub API to work.
    experimental: {
      websocket: true,
    },

    // The node-server preset does NOT compress responses by default. This
    // pre-compresses every static asset at BUILD time (no runtime CPU cost)
    // and serves the .br/.gz variant automatically; brotli cuts the ~78 KiB
    // render-blocking CSS bundle to roughly a fifth of its size, which
    // directly improves FCP and LCP.
    compressPublicAssets: {
      brotli: true,
      gzip: true,
    },
  },

  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },

    /* ------------------------------------------------------------------ */
    /* CSS build pipeline                                                  */
    /* ------------------------------------------------------------------ */
    css: {
      transformer: 'lightningcss',
      lightningcss: {
      // Without explicit targets, Lightning CSS assumes the OLDEST
      // possible browsers and "helpfully" rewrites/strips modern
      // properties — which is how the unprefixed `backdrop-filter`
      // line disappeared from the production bundle while the
      // -webkit- variant survived (dev mode skips minification, so
      // the bug only shows after deploy).
      //
      // These targets match the browsers we actually support; with
      // them, `backdrop-filter`, `@supports` and CSS custom
      // properties are emitted untouched. Safari 15.4+ handles
      // backdrop-filter UNPREFIXED, so keeping our hand-written
      // -webkit- line in the source covers the older iOS versions.
        targets: {
          chrome: 100 << 16, // Chrome 100
          edge: 100 << 16, // Edge 100
          firefox: 103 << 16, // Firefox 103 (first with backdrop-filter)
          safari: 15 << 16 | 4 << 8, // Safari 15.4
          ios_saf: 15 << 16 | 4 << 8, // iOS Safari 15.4
        },
      },
    },

    build: {
    // One CSS bundle instead of ~23 per-component files (VList.css,
    // VMenu.css, ...). Every split file is a render-blocking request on
    // first paint; a single file is one request, cached after the first
    // page load. Total CSS byte size is unchanged.
      cssCodeSplit: false,

      // Be explicit so a future Vite/Nuxt upgrade cannot silently switch
      // the minifier back to esbuild with different behavior.
      cssMinify: 'lightningcss',
    },

    plugins: [
      vuetify({
        autoImport: true,
      }),
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Modules                                                             */
  /* ------------------------------------------------------------------ */
  // @nuxtjs/cloudinary: cloud name comes from NUXT_CLOUDINARY_CLOUD_NAME.
  // CldImage/CldVideoPlayer deliver with f_auto/q_auto by default.
  cloudinary: {
    cloudName: process.env.NUXT_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  },

  // ESLint handles BOTH linting and formatting (no Prettier) via its
  // stylistic rules, which is the recommended setup for @nuxt/eslint and
  // avoids the classic ESLint/Prettier conflicts. The concrete style
  // preferences are defined in eslint.config.mjs.
  eslint: {
    config: {
      stylistic: {
        indent: 2,
        quotes: 'single',
        semi: false,
        commaDangle: 'always-multiline',
      },
    },
  },

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'ar',
    locales: [
      { code: 'ar', iso: 'ar-DZ', name: 'العربية', file: 'ar.json', dir: 'rtl' },
      { code: 'fr', iso: 'fr-FR', name: 'Français', file: 'fr.json', dir: 'ltr' },
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
    },
  },

  // @nuxt/icon: mdi is installed locally (@iconify-json/mdi), so icons must
  // never be fetched from api.iconify.design at runtime (blocked by our CSP
  // anyway, and each fetch is an extra network round trip).
  // - serverBundle serves any mdi icon from our own /api/_nuxt_icon endpoint.
  // - clientBundle scans the code and inlines the icons it finds, plus the
  //   two Vuetify defaults (mdi:circle, mdi:menu) that are only resolved at
  //   runtime, so the browser needs zero icon requests at all.
  icon: {
    provider: 'server',
    serverBundle: {
      collections: ['mdi'],
    },
    clientBundle: {
      scan: true,
      icons: ['mdi:circle', 'mdi:menu'],
    },
    fallbackToApi: false,
  },

  // @nuxt/image: remote hosts allowed for optimized image delivery.
  image: {
    domains: [
      'res.cloudinary.com',
      'upload.wikimedia.org',
      'www.lejourdalgerie.com',
      'images.unsplash.com',
      'picsum.photos',
      'placehold.co',
      'source.unsplash.com',
      'images.pexels.com',
    ],
  },

  // nuxt-security: CSP tuned for Google AdSense + YouTube embeds + realtime
  // websockets. script-src keeps the module default ('strict-dynamic' +
  // nonce), which already covers the adsbygoogle.js tag injected by
  // useAdsense().
  security: {
    headers: {
      contentSecurityPolicy: {
        // AdSense serves its creatives from many image hosts.
        'img-src': ['\'self\'', 'data:', 'https:'],

        // adtrafficquality.google: part of AdSense's invalid-traffic checks;
        // blocking it makes ads fail to render and pollutes the console.
        // fundingchoicesmessages.google.com: serves the AdSense consent
        // message (Funding Choices); needs frame-src (the consent iframe)
        // and connect-src (its status pings).
        // YouTube embeds: article galleries use the privacy-enhanced
        // youtube-nocookie.com domain; plain youtube.com is allowed too so a
        // regular embed URL in content does not render an empty frame.
        'frame-src': [
          '\'self\'',
          'https://googleads.g.doubleclick.net',
          'https://tpc.googlesyndication.com',
          'https://ep1.adtrafficquality.google',
          'https://ep2.adtrafficquality.google',
          'https://fundingchoicesmessages.google.com',
          'https://www.youtube-nocookie.com',
          'https://www.youtube.com',
        ],

        // 'self' covers same-origin ws/wss, but browser support for that is
        // inconsistent, so the websocket schemes are listed explicitly.
        // Without them the realtime comment and notification sockets
        // (/_ws/*) are blocked in production.
        'connect-src': [
          '\'self\'',
          'ws:',
          'wss:',
          'https://pagead2.googlesyndication.com',
          'https://*.g.doubleclick.net',
          'https://ep1.adtrafficquality.google',
          'https://ep2.adtrafficquality.google',
          'https://fundingchoicesmessages.google.com',
          // GA4: gtag.js sends events via fetch to a regional collect endpoint.
          // The region prefix varies per visitor (region1, region2, ...), so a
          // wildcard is required.
          'https://*.google-analytics.com',
          'https://*.analytics.google.com',
          'https://stats.g.doubleclick.net',

        ],
      },

      // Ad iframes are not served with CORP headers, so an isolating policy
      // would make them fail to render.
      crossOriginEmbedderPolicy: 'unsafe-none',
    },

    // Global default: generous enough for normal browsing, SSR data fetches
    // and the image proxy. A single page load issues many requests, so a tiny
    // limit here would 429 the whole site. The strict brute-force limit is
    // applied per-route to the auth endpoints in routeRules.
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 60000,
    },
  },
})
