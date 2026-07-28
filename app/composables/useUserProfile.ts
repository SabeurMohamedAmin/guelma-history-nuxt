export interface UserProfileData {
  id: number
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  passwordChangedAt: string | null
  loggedInAt: string | null
  role: 'user'
}

/**
 * Loads the signed-in user's profile and exposes typed actions for each
 * mutation. The page binds to `profile` and calls these actions; the session
 * is kept in sync via `useUserSession().fetch()` after changes that affect the
 * navbar avatar/name or the login credentials.
 *
 * Mirrors `useAdminProfile`, but targets the public user endpoints under
 * /api/auth/user/profile.
 */
export function useUserProfile() {
  const { fetch: refreshSession } = useUserSession()

  // The `profile-page` route middleware guarantees only a complete user (who
  // can read this endpoint) ever reaches the page, so the request can run
  // immediately. `error` stays exposed for defensive handling.
  const { data: profile, pending, error, refresh } = useFetch<UserProfileData>('/api/auth/user/profile')

  async function updateDisplayName(displayName: string) {
    await $fetch('/api/auth/user/profile/display-name', {
      method: 'PATCH',
      body: { displayName },
    })
    await Promise.all([refresh(), refreshSession()])
  }

  async function changeEmail(email: string, currentPassword: string) {
    await $fetch('/api/auth/user/profile/email', {
      method: 'PATCH',
      body: { email, currentPassword },
    })
    await Promise.all([refresh(), refreshSession()])
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await $fetch('/api/auth/user/profile/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    })
    await refresh()
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    await $fetch('/api/auth/user/profile/avatar', { method: 'POST', body: formData })
    await Promise.all([refresh(), refreshSession()])
  }

  return {
    profile,
    pending,
    error,
    refresh,
    updateDisplayName,
    changeEmail,
    changePassword,
    uploadAvatar,
  }
}
