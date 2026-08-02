export interface AdminProfileData {
  id: string
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  passwordChangedAt: string | null
  loggedInAt: string | null
  role: 'admin'
}

/**
 * Loads the admin profile and exposes typed actions for each mutation.
 * The page binds to `profile` and calls these actions; the session is kept in
 * sync via `useUserSession().fetch()` after changes that affect it.
 */
export function useAdminProfile() {
  const { fetch: refreshSession } = useUserSession()

  const { data: profile, pending, refresh } = useFetch<AdminProfileData>('/api/admin/profile')

  async function updateDisplayName(displayName: string) {
    await $fetch('/api/admin/profile/display-name', {
      method: 'PATCH',
      body: { displayName },
    })
    await Promise.all([refresh(), refreshSession()])
  }

  async function changeEmail(email: string, currentPassword: string) {
    await $fetch('/api/admin/profile/email', {
      method: 'PATCH',
      body: { email, currentPassword },
    })
    await Promise.all([refresh(), refreshSession()])
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await $fetch('/api/admin/profile/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    })
    await refresh()
  }

  async function uploadAvatar(file: File) {
    const formData = new FormData()
    formData.append('avatar', file)
    await $fetch('/api/admin/profile/avatar', { method: 'POST', body: formData })
    await Promise.all([refresh(), refreshSession()])
  }

  return {
    profile,
    pending,
    refresh,
    updateDisplayName,
    changeEmail,
    changePassword,
    uploadAvatar,
  }
}
