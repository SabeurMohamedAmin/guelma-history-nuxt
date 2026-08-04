export interface AdminMobileSession {
  id: string
  deviceId: string
  deviceName: string | null
  platform: 'android' | 'ios'
  appVersion: string | null
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
}

/** Manage Flutter device sessions through the web admin's cookie session. */
export function useAdminMobileSessions() {
  const { data: sessions, pending, refresh } = useFetch<AdminMobileSession[]>(
    '/api/admin/profile/mobile-sessions',
    { default: () => [] },
  )

  async function revokeSession(sessionId: string) {
    await $fetch(`/api/admin/profile/mobile-sessions/${sessionId}`, { method: 'DELETE' })
    await refresh()
  }

  return { sessions, pending, refresh, revokeSession }
}
