import { findOrLinkOauthUser, AccountExistsError } from '~~/server/utils/user-account'
import { localizedPath } from '~~/server/utils/i18n-redirect'
import { facebookPictureUrl, storeRemoteAvatar } from '~~/server/utils/remoteAvatar'

/**
 * GET /api/auth/user/facebook/register
 * Register (or link) an account with Facebook.
 *
 * Rules enforced here:
 * - No email from Facebook -> reject. An emailless Facebook identity can never
 *   register (redirect with an error flag).
 * - Email already belongs to a user -> we DO NOT silently link. Facebook does
 *   not assert email-verification to us, so an attacker controlling a Facebook
 *   identity with a victim's email could otherwise take over the local
 *   account. findOrLinkOauthUser only auto-links when the provider email is
 *   asserted verified; otherwise it raises a conflict and we send the visitor
 *   to log in to the existing account and link from there.
 * - New -> create an INCOMPLETE account (no password yet) and send them to the
 *   profile form to choose a username + password. Its email IS stamped
 *   verified at creation, because Facebook only returns an address it verified
 *   for that identity. Do not remove that stamp to "harden" this flow:
 *   authenticate() requires emailVerifiedAt, so these accounts would then never
 *   be able to sign in with a password. It does not relax the auto-link guard
 *   above, which is governed by the separate emailVerified flag.
 *
 * Avatar: the Facebook profile picture is downloaded and stored as BYTES in the
 * users table (avatarData/avatarMimeType/avatarUpdatedAt), exactly like the
 * admin/author avatars — never as a URL. It is fetched on demand later from the
 * stored bytes. We only store it when the account has no avatar yet, so a
 * picture chosen later by the user is never overwritten.
 */
export default defineOAuthFacebookEventHandler({
  config: {
    // `scope` grants permission to read the email; `fields` is what actually
    // gets requested from the Graph API `me` endpoint. Without `email` in
    // `fields`, Facebook returns only id+name and `fbUser.email` is empty.
    // `picture.type(large)` returns a ~200px photo at `picture.data.url`.
    // `birthday` additionally requires the `user_birthday` permission (subject
    // to Facebook app review); when it is not granted the field is simply
    // absent and we store no date of birth.
    scope: ['email'],
    fields: ['id', 'name', 'first_name', 'last_name', 'email', 'birthday', 'picture.type(large)'],
  },
  async onSuccess(event, { user: fbUser }) {
    const email = typeof fbUser.email === 'string' ? fbUser.email.trim().toLowerCase() : ''

    // Hard rule: no Facebook-without-email registration, ever.
    if (!email) {
      return sendRedirect(event, localizedPath(event, '/register?error=fb-no-email'))
    }

    let user
    try {
      user = await findOrLinkOauthUser({
        provider: 'facebook',
        providerUserId: String(fbUser.id),
        email,
        // Facebook's Graph API does not assert email-verification status to us,
        // so we must treat the address as UNVERIFIED for auto-linking. This
        // prevents silent auto-linking to (and takeover of) an existing local
        // account.
        emailVerified: false,
        // ...but a BRAND-NEW Facebook account owns the address Facebook returns,
        // so stamp email_verified_at at creation. This only affects new
        // accounts and never relaxes the auto-link guard above.
        markEmailVerified: true,
        displayName: typeof fbUser.name === 'string' ? fbUser.name : null,
        firstName: typeof fbUser.first_name === 'string' ? fbUser.first_name : null,
        lastName: typeof fbUser.last_name === 'string' ? fbUser.last_name : null,
        // Facebook returns the birthday as MM/DD/YYYY; convert to the
        // YYYY-MM-DD format the `date_of_birth` column expects.
        dateOfBirth: parseFacebookBirthday(fbUser.birthday),
      })
    }
    catch (error) {
      if (error instanceof AccountExistsError) {
        // An account with this email already exists but we can't safely link an
        // unverified provider identity to it. Ask the visitor to sign in first.
        return sendRedirect(event, localizedPath(event, '/login?error=email-exists'))
      }
      throw error
    }

    // Persist the Facebook picture as bytes when the account has none yet, so
    // a picture chosen later by the user is never overwritten. Done as a side
    // effect so the session payload below stays untouched.
    const pictureUrl = facebookPictureUrl(fbUser)
    if (pictureUrl && !user.hasAvatar) {
      await storeRemoteAvatar(user.id, pictureUrl)
    }

    // A freshly created account still needs a username + password; an account
    // linked to an existing login is already complete and goes home.
    await setUserSession(event, { user, loggedInAt: new Date().toISOString() })
    return sendRedirect(event, localizedPath(event, user.profileCompleted ? '/' : '/register/complete'))
  },
  onError(event) {
    return sendRedirect(event, localizedPath(event, '/register?error=facebook'))
  },
})

/**
 * Facebook returns `birthday` as `MM/DD/YYYY` (and, depending on the user's
 * privacy settings / granted permissions, sometimes just `MM/DD` or `YYYY`).
 * We only accept the full `MM/DD/YYYY` shape and convert it to the
 * `YYYY-MM-DD` string the `date_of_birth` column stores; anything else yields
 * null so we never persist a partial or malformed date.
 */
function parseFacebookBirthday(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null

  const [, month, day, year] = match
  return `${year}-${month}-${day}`
}
