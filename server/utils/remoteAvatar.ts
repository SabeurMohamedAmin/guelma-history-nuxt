import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { processAvatarImage } from './avatarImage'

/**
 * Hardened fetch for provider-supplied avatar URLs (e.g. the Facebook profile
 * picture). Provider responses are untrusted input, so treating any URL they
 * hand us as a `fetch` target is a classic SSRF vector: a spoofed response or a
 * redirect chain could point at internal services (cloud metadata, localhost,
 * internal DBs). This helper locks the request down:
 *
 * - HTTPS scheme only.
 * - Host must match an allowlist of provider CDN domains.
 * - Redirects are followed manually so every hop's host is re-validated.
 * - Resolved IPs are checked against private/loopback/link-local ranges.
 * - A hard timeout prevents slow-loris style stalls.
 * - The body is read as a stream and aborted as soon as it exceeds the cap,
 *   so a hostile URL can't force us to buffer a huge response before the
 *   size check.
 */

/** Max bytes we will download for a remote avatar before aborting. */
export const MAX_REMOTE_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB

/** Max time (ms) for the whole download, including redirects. */
const FETCH_TIMEOUT_MS = 5_000

/** Max redirect hops we will follow before giving up. */
const MAX_REDIRECTS = 3

/**
 * Hosts we trust to serve provider avatars. An exact host match or a match on
 * a `.`-prefixed suffix (so `scontent.xx.fbcdn.net` matches `.fbcdn.net`).
 *
 * Facebook serves Graph `picture` URLs from several CDNs, not just fbcdn.net:
 * the lookaside hosts (platform-lookaside.fbsbx.com, lookaside.facebook.com)
 * are the common ones for profile photos, so they must be allowlisted too or
 * the avatar fetch is rejected as "not allowlisted" and silently skipped.
 */
const ALLOWED_AVATAR_HOST_SUFFIXES = [
  '.fbcdn.net',
  '.facebook.com',
  '.fbsbx.com',
  'fbcdn.net',
  'facebook.com',
  'fbsbx.com',
]

export interface RemoteAvatar {
  data: Buffer
  mimeType: string
}

/**
 * Pull the usable picture URL out of a Facebook Graph `me` response.
 *
 * Graph shape: `{ picture: { data: { url, is_silhouette } } }`. We return null
 * when the picture is missing, is the generic silhouette placeholder, or has no
 * string URL, so callers never store a blank avatar. Defensive about the exact
 * shape because the field is only present when `picture.type(large)` was
 * requested and the user actually has a photo.
 */
export function facebookPictureUrl(fbUser: unknown): string | null {
  const data = (fbUser as { picture?: { data?: { url?: unknown, is_silhouette?: unknown } } })?.picture?.data
  if (!data || data.is_silhouette === true) return null
  return typeof data.url === 'string' && data.url.length > 0 ? data.url : null
}

/**
 * Download a remote avatar (e.g. the Facebook picture URL) through the
 * SSRF-safe fetchRemoteAvatar helper and write the raw bytes onto the user row
 * (avatarData/avatarMimeType/avatarUpdatedAt), mirroring the admin/author
 * avatar storage. Best-effort: never blocks authentication. Failures are
 * logged (the URL is never logged) instead of silently swallowed, so SSRF
 * probes and unexpected DB errors stay observable.
 */
export async function storeRemoteAvatar(userId: number, url: string): Promise<void> {
  try {
    const avatar = await fetchRemoteAvatar(url)
    if (!avatar) return

    await db
      .update(users)
      .set({
        avatar: null,
        avatarData: avatar.data,
        avatarMimeType: avatar.mimeType,
        avatarUpdatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  }
  catch (error) {
    console.warn(`storeRemoteAvatar failed for user ${userId}:`, (error as Error).message)
  }
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return ALLOWED_AVATAR_HOST_SUFFIXES.some(
    suffix => host === suffix || host.endsWith(suffix.startsWith('.') ? suffix : `.${suffix}`),
  )
}

/**
 * True for IPs that must never be reachable from a user-influenced fetch:
 * loopback, private RFC1918, link-local (incl. the cloud metadata address
 * 169.254.169.254), unique-local IPv6 and unspecified addresses.
 */
function isBlockedIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) {
    const parts = ip.split('.').map(Number)
    const [a, b] = parts
    if (a === 127) return true // loopback
    if (a === 10) return true // private
    if (a === 172 && b! >= 16 && b! <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 169 && b === 254) return true // link-local / metadata
    if (a === 0) return true // unspecified
    return false
  }
  if (family === 6) {
    const v6 = ip.toLowerCase()
    if (v6 === '::1' || v6 === '::') return true // loopback / unspecified
    if (v6.startsWith('fe80')) return true // link-local
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true // unique-local
    if (v6.startsWith('::ffff:')) return isBlockedIp(v6.slice('::ffff:'.length)) // mapped v4
    return false
  }
  // Not a literal IP (e.g. a hostname slipped through): treat as blocked.
  return true
}

/**
 * Validate a single URL: HTTPS, allowlisted host, and every resolved address
 * outside the blocked ranges. Throws on any violation.
 */
async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  }
  catch {
    throw new Error('Invalid avatar URL')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Avatar URL must use HTTPS')
  }
  if (!isAllowedHost(url.hostname)) {
    throw new Error('Avatar host is not allowlisted')
  }

  // Resolve the host and reject if ANY address falls in a blocked range, so a
  // DNS record pointing at an internal IP can't be used to reach it.
  const records = await lookup(url.hostname, { all: true })
  if (records.length === 0 || records.some(r => isBlockedIp(r.address))) {
    throw new Error('Avatar host resolves to a blocked address')
  }

  return url
}

/**
 * Download a remote avatar safely, then normalize it with sharp so we never
 * store a large provider image. Returns the processed image bytes + mime type
 * (a small square WebP), or `null` if the resource is not a usable image.
 * Throws on SSRF-policy violations and network/timeout errors so the caller
 * can log and move on.
 */
export async function fetchRemoteAvatar(rawUrl: string): Promise<RemoteAvatar | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    let current = await assertSafeUrl(rawUrl)
    let response: Response | null = null

    // Follow redirects manually, re-validating the host of every hop.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, { redirect: 'manual', signal: controller.signal })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) throw new Error('Redirect without a location')
        // Resolve relative redirects against the current URL, then re-validate.
        current = await assertSafeUrl(new URL(location, current).toString())
        continue
      }

      response = res
      break
    }

    if (!response) throw new Error('Too many redirects')
    if (!response.ok || !response.body) return null

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!mimeType.startsWith('image/')) return null

    // Reject early if the declared length already exceeds the cap.
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_REMOTE_AVATAR_BYTES) return null

    // Stream the body, aborting the moment we cross the cap so a hostile or
    // mislabeled response can't make us buffer an unbounded payload.
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.length
      if (total > MAX_REMOTE_AVATAR_BYTES) {
        controller.abort()
        return null
      }
      chunks.push(value)
    }

    if (total === 0) return null

    // Normalize the downloaded image: sharp downscales it to a small, uniform
    // square WebP, so a 5MB provider photo is stored as a few KB and the
    // stored bytes match the format used by user-uploaded avatars. Returns
    // null (not throws) on an undecodable image so a bad picture never blocks
    // sign-in. processAvatarImage throws createError on failure, so we guard it.
    try {
      return await processAvatarImage(Buffer.concat(chunks))
    }
    catch {
      return null
    }
  }
  finally {
    clearTimeout(timeout)
  }
}
