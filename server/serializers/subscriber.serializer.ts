type SubscriberRow = {
  id: string
  email: string
  status: string
  confirmedAt: Date | null
  unsubscribedAt: Date | null
  lastEmailSentAt: Date | null
  createdAt: Date
}

/** Explicit allowlist prevents confirmation tokens or other private columns leaking. */
export function serializeMobileSubscriber(subscriber: SubscriberRow) {
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    confirmedAt: subscriber.confirmedAt?.toISOString() ?? null,
    unsubscribedAt: subscriber.unsubscribedAt?.toISOString() ?? null,
    lastEmailSentAt: subscriber.lastEmailSentAt?.toISOString() ?? null,
    createdAt: subscriber.createdAt.toISOString(),
  }
}
