import type { Role } from '~~/shared/auth/roles'

/**
 * Client-side typing for the session exposed by nuxt-auth-utils.
 *
 * This MUST mirror the session-safe user produced on the server in
 * `server/utils/auth.ts` (`toSessionUser`). Middleware and the auth store rely
 * on `user.role`, so keep these shapes in sync.
 */
export interface SessionUser {
  id: string
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  role: Role
  // False while an OAuth signup still needs to choose a username + password.
  // Drives the "finish setup" banner and the complete-profile redirect.
  profileCompleted: boolean
}

export {}
