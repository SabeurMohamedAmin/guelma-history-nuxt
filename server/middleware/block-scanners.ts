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
const SCANNER_PATH = /^\/(?:wp-|wordpress|\.env|\.git)|\.php(?:$|\?)/i

export default defineEventHandler((event) => {
  if (SCANNER_PATH.test(event.path)) {
    setResponseStatus(event, 404)
    setResponseHeader(event, 'content-type', 'text/plain')
    return 'Not Found'
  }
})
