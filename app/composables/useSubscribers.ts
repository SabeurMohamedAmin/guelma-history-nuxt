/** Newsletter subscriber row as returned by GET /api/admin/subscribers. */
export type SubscriberStatus = 'pending' | 'active' | 'unsubscribed'

export interface AdminSubscriber {
  id: string
  email: string
  status: SubscriberStatus
  confirmedAt: string | null
  unsubscribedAt: string | null
  lastEmailSentAt: string | null
  createdAt: string
}

/**
 * Client composable for the admin newsletter subscribers area.
 *
 * Single responsibility: wrap $fetch calls with shared loading/error state,
 * mirroring useAuthors / useCategories so all admin areas behave the same way.
 */
export function useSubscribers() {
  const subscribers = ref<AdminSubscriber[]>([])
  const pending = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    pending.value = true
    error.value = null
    try {
      return await fn()
    }
    catch (err: unknown) {
      error.value = extractErrorMessage(err, 'Unexpected error')
      throw err
    }
    finally {
      pending.value = false
    }
  }

  async function fetchAll() {
    const data = await run(() => $fetch<AdminSubscriber[]>('/api/admin/subscribers'))
    subscribers.value = data
    return data
  }

  function deleteSubscriber(id: string) {
    return run(() => $fetch<null>(`/api/admin/subscribers/${id}`, { method: 'DELETE' }))
  }

  function updateSubscriberStatus(id: string, status: Extract<SubscriberStatus, 'active' | 'unsubscribed'>) {
    return run(() => $fetch<null>(`/api/admin/subscribers/${id}/subscription`, {
      method: 'PATCH',
      body: { status },
    }))
  }

  /** URL of the active-subscribers CSV export (opened in a new tab). */
  const exportUrl = '/api/admin/subscribers/export'

  return {
    subscribers: readonly(subscribers),
    pending: readonly(pending),
    error: readonly(error),
    exportUrl,
    fetchAll,
    deleteSubscriber,
    updateSubscriberStatus,
  }
}
