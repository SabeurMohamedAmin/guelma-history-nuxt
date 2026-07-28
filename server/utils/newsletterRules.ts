export type NewsletterSubscriptionStatus = 'pending' | 'active' | 'unsubscribed'

/** True only when an article moves from not published to published. */
export function isFirstPublish(previousPublishedAt: Date | null, nextPublishedAt: Date | null): boolean {
  return previousPublishedAt === null && nextPublishedAt !== null
}

/** True when a submitted email should receive a confirmation email. */
export function shouldSendConfirmationEmail(status: NewsletterSubscriptionStatus | null): boolean {
  return status !== 'active'
}

/** True when a pending confirmation token is still usable. */
export function isConfirmationTokenValid(status: NewsletterSubscriptionStatus, tokenExpiresAt: Date | null, now = new Date()): boolean {
  return status === 'pending' && tokenExpiresAt !== null && tokenExpiresAt > now
}
