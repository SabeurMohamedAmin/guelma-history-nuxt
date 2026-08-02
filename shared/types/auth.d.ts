/**
 * Type augmentation for nuxt-auth-utils sessions.
 *
 * The `role` field is included now so the same session shape can support
 * future non-admin users without a breaking change — middleware and guards
 * can branch on `role` when more roles are introduced.
 */
import type { Role } from '~~/shared/auth/roles'

declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    email: string
    displayName: string | null
    hasAvatar: boolean
    avatarUpdatedAt: string | null
    role: Role
    // False while an OAuth signup still needs to choose a username + password.
    profileCompleted: boolean
  }

  interface UserSession {
    // ISO timestamp of when this session was established.
    loggedInAt: string
  }
}

export {}
