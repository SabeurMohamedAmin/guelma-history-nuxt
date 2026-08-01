// Bots constantly probe public sites for known WordPress/PHP vulnerabilities
// (/wp-admin/install.php, /wp-login.php, /xmlrpc.php, /.env, ...). None of
// these paths exist in this Nuxt app, so instead of letting each probe run a
// full Vue SSR render (which also logs a noisy "[Vue Router warn]: No match
// found" line per hit), answer here at the Nitro layer with a cheap
// plain-text 404 and stop processing immediately.
//
// The pattern matches, case-insensitively:
// - any path starting with /wp- or /wordpress   (WordPress probes)
// - any path ending in .php                     (this app serves no PHP)
// - /.env, /.git and anything under them        (secret/config sniffing)
const SCANNER_PATH = /^\/(?:wp-|wordpress|\.env(?:\/|$)|\.git(?:\/|$))/i

// Common credential, framework-debugger and AI API discovery probes. These
// endpoints are not part of this application. Matching complete path segments
// avoids blocking legitimate application routes with similar names.
const CREDENTIAL_PROBE_PATH = /^\/(?:config\/\.env|\.aws\/credentials)$/i
const DEBUG_PROBE_PATH = /^\/_profiler(?:\/|$)/i
const AI_API_PROBE_PATH = /^\/(?:api\/)?v1\/models\/?$/i

// Any path ending in .php, wherever it sits (/a/b/install.php).
const PHP_PATH = /\.php$/i

// iOS and macOS request one of these two files on their own the first time a
// visitor opens or shares a link to the site, to check whether a native app
// should handle the URL. There is no native app here, so the files do not
// exist and every visit from an Apple device logged a router warning.
const APPLE_APP_LINK_PATH = /^\/(?:\.well-known\/)?apple-app-site-association$/i

// NOTE: only the Apple files are handled under /.well-known/. The rest of that
// folder stays open on purpose, in particular /.well-known/acme-challenge/*,
// which the TLS certificate renewal depends on. /ads.txt and /robots.txt are
// untouched as well, so Google AdSense verification keeps working.

export default defineEventHandler((event) => {
  // Drop the query string, then collapse duplicated leading slashes.
  // Scanners send "//wp-includes/wlwmanifest.xml": Vue Router refuses to
  // resolve a location starting with two slashes (VUE_ROUTER_R0003) and then
  // logs a second warning for the missing route (VUE_ROUTER_R0004). Comparing
  // the cleaned path with the original also tells us the request had those
  // extra slashes, which no real link on this site ever has.
  const path = event.path.replace(/\?.*$/, '')
  const cleanPath = path.replace(/^\/{2,}/, '/')

  const hasDoubleSlash = cleanPath !== path
  const isProbe = SCANNER_PATH.test(cleanPath)
    || CREDENTIAL_PROBE_PATH.test(cleanPath)
    || DEBUG_PROBE_PATH.test(cleanPath)
    || AI_API_PROBE_PATH.test(cleanPath)
    || PHP_PATH.test(cleanPath)
    || APPLE_APP_LINK_PATH.test(cleanPath)

  if (hasDoubleSlash || isProbe) {
    setResponseStatus(event, 404)
    setResponseHeader(event, 'content-type', 'text/plain')
    return 'Not Found'
  }
})
