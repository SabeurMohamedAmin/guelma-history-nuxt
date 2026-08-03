import type { AdminProfileResponse } from '~~/server/services/admin-profile.service'

export function serializeMobileAdminProfile(profile: AdminProfileResponse) {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    displayName: profile.displayName,
    hasAvatar: profile.hasAvatar,
    avatarUpdatedAt: profile.avatarUpdatedAt?.toISOString() ?? null,
    passwordChangedAt: profile.passwordChangedAt?.toISOString() ?? null,
    role: profile.role,
  }
}
