import { findOauthUser } from '~~/server/utils/user-account'
import { localizedPath } from '~~/server/utils/i18n-redirect'
import { facebookPictureUrl, storeRemoteAvatar } from '~~/server/utils/remoteAvatar'

/**
 * GET /api/auth/user/facebook/login
 * Sign in with Facebook (existing accounts only).
 *
 * On a successful Facebook handshake we look up the LINKED local account. If
 * one exists we start a session; if not, we deliberately create nothing and
 * send the visitor to the register page with a reason flag, so the UI can tell
 * them they have no account yet. This is what keeps "login" and "register"
 * distinct for an unknown Facebook user.
 *
 * Avatar: if the linked account has no stored avatar yet (e.g. it predates
 * avatar capture, or was linked from a form account), we backfill the Facebook
 * picture as BYTES into the users table (same columns as admin/author avatars),
 * fetched on demand later from the stored bytes. The backfill runs after the
 * session is set, so it never alters the session payload.
 */
export default defineOAuthFacebookEventHandler({
  config: {
    scope: ['email'],
    // `picture.type(large)` returns a ~200px photo at `picture.data.url`.
    fields: ['id', 'name', 'email', 'picture.type(large)'],
  },
  async onSuccess(event, { user: fbUser }) {
    const providerUserId = String(fbUser.id)
    const user = await findOauthUser('facebook', providerUserId)

    if (!user) {
      // No linked account -> create nothing here; send the visitor to register.
      return sendRedirect(event, localizedPath(event, '/register?reason=no-account'))
    }

    await setUserSession(event, {
      user,
      loggedInAt: new Date().toISOString(),
    })

    // Backfill the avatar only when the linked account has none yet.
    const pictureUrl = facebookPictureUrl(fbUser)
    if (pictureUrl && !user.hasAvatar) {
      await storeRemoteAvatar(user.id, pictureUrl)
    }

    return sendRedirect(event, localizedPath(event, '/'))
  },
  onError(event) {
    return sendRedirect(event, localizedPath(event, '/login?error=facebook'))
  },
})
