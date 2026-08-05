import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { and, eq, gt, lte, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { newsletterArticleEmails } from '~~/server/db/schema/newsletter-article-emails'
import { subscribers } from '~~/server/db/schema/subscribers'
import { sendNewsletterArticleAlert } from '~~/server/utils/email/newsletter-article-alert'

/**
 * Newsletter subscription + confirmation token lifecycle.
 *
 * Security model:
 * - Raw tokens are random and returned only once (they go in email links).
 * - Only SHA-256 hashes are persisted.
 * - Confirmation tokens are single-use and expire after 7 days.
 * - Unsubscribe tokens are stable per active subscriber, but only stored hashed.
 */

const TOKEN_BYTES = 32
const CONFIRMATION_TTL_DAYS = 7

/** Hash a raw token for storage/lookup (fast, deterministic — not a password). */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

function createRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

function createConfirmationExpiry(now = new Date()): Date {
  return new Date(now.getTime() + CONFIRMATION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export interface RequestSubscriptionResult {
  /** Raw token to embed in the confirmation email link. Empty when already active. */
  rawToken: string
  /** True when the email was already active before this request. */
  alreadyActive: boolean
  /** Backwards-compatible alias for older endpoint code. */
  alreadyConfirmed: boolean
}

export interface ActiveNewsletterSubscriber {
  id: string
  email: string
  unsubscribeTokenHash: string | null
}

export interface PublishedArticleNewsletterInput {
  id: string
  slug: string
  titleAr: string
  titleFr: string
}

/**
 * Create or refresh a pending subscription for `email` and issue a fresh
 * confirmation token. Re-subscribing a pending/unsubscribed address rotates the
 * token so a lost email can be re-sent safely.
 */
export async function requestSubscription(email: string): Promise<RequestSubscriptionResult> {
  const existing = await db.query.subscribers.findFirst({
    where: eq(subscribers.email, email),
  })

  if (existing?.status === 'active') {
    return { rawToken: '', alreadyActive: true, alreadyConfirmed: true }
  }

  const now = new Date()
  const rawToken = createRawToken()
  const tokenHash = hashToken(rawToken)
  const tokenExpiresAt = createConfirmationExpiry(now)

  if (existing) {
    await db
      .update(subscribers)
      .set({
        status: 'pending',
        tokenHash,
        tokenExpiresAt,
        confirmationSentAt: now,
        confirmedAt: null,
        unsubscribedAt: null,
        updatedAt: now,
      })
      .where(eq(subscribers.id, existing.id))
  }
  else {
    await db
      .insert(subscribers)
      .values({
        email,
        status: 'pending',
        tokenHash,
        tokenExpiresAt,
        confirmationSentAt: now,
      })
  }

  return { rawToken, alreadyActive: false, alreadyConfirmed: false }
}

/**
 * Consume a raw confirmation token: validates it is pending and unexpired, marks
 * the subscriber active, clears confirmation token fields, and creates a stable
 * unsubscribe token hash if the row does not already have one.
 */
export async function confirmSubscription(rawToken: string): Promise<boolean> {
  const now = new Date()

  // Generated up front; the COALESCE below keeps an existing hash, so a
  // repeat confirmation can never rotate a subscriber's unsubscribe token.
  const newUnsubscribeTokenHash = hashToken(createRawToken())

  // Single conditional UPDATE: the WHERE clause validates AND claims the
  // token in one atomic statement, so a concurrent confirmation (or a token
  // rotated by a re-subscribe between a read and a write) can never activate
  // a stale state. Zero updated rows = invalid, expired, or already used.
  const updated = await db
    .update(subscribers)
    .set({
      status: 'active',
      confirmedAt: now,
      tokenHash: null,
      tokenExpiresAt: null,
      unsubscribeTokenHash: sql`coalesce(${subscribers.unsubscribeTokenHash}, ${newUnsubscribeTokenHash})`,
      unsubscribedAt: null,
      updatedAt: now,
    })
    .where(and(
      eq(subscribers.status, 'pending'),
      eq(subscribers.tokenHash, hashToken(rawToken)),
      gt(subscribers.tokenExpiresAt, now),
    ))
    .returning({ id: subscribers.id })

  return updated.length > 0
}

/** Mark an active subscriber as unsubscribed using a signed unsubscribe token. */
export async function unsubscribe(rawToken: string): Promise<boolean> {
  const subscriberId = verifyUnsubscribeToken(rawToken)
  if (!subscriberId) return false

  const now = new Date()

  // One conditional UPDATE instead of read-then-write: the status check in
  // the WHERE clause makes concurrent unsubscribes idempotent (one claims
  // the row, the other simply updates nothing).
  const updated = await db
    .update(subscribers)
    .set({
      status: 'unsubscribed',
      unsubscribedAt: now,
      updatedAt: now,
    })
    .where(and(
      eq(subscribers.id, subscriberId),
      eq(subscribers.status, 'active'),
    ))
    .returning({ id: subscribers.id })

  return updated.length > 0
}

/** Delete pending subscriptions whose confirmation token expired. */
export async function cleanupExpiredPendingSubscriptions(now = new Date()): Promise<number> {
  const deletedRows = await db
    .delete(subscribers)
    .where(and(
      eq(subscribers.status, 'pending'),
      lte(subscribers.tokenExpiresAt, now),
    ))
    .returning({ id: subscribers.id })

  return deletedRows.length
}

/** Active recipients for article alert emails. */
export async function listActiveSubscribers(): Promise<ActiveNewsletterSubscriber[]> {
  return db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      unsubscribeTokenHash: subscribers.unsubscribeTokenHash,
    })
    .from(subscribers)
    .where(eq(subscribers.status, 'active'))
}

/**
 * Record that one article alert was sent to one subscriber.
 * Returns false when the record already exists, which means this subscriber has
 * already received this article alert.
 */
export async function recordArticleEmailSent(articleId: string, subscriberId: string): Promise<boolean> {
  const insertedRows = await db
    .insert(newsletterArticleEmails)
    .values({ articleId, subscriberId })
    .onConflictDoNothing()
    .returning({ id: newsletterArticleEmails.id })

  if (insertedRows.length === 0) return false

  await db
    .update(subscribers)
    .set({ lastEmailSentAt: new Date(), updatedAt: new Date() })
    .where(eq(subscribers.id, subscriberId))

  return true
}

/**
 * Send article alerts to active subscribers after an article is first published.
 *
 * This function is safe to call more than once for the same article: the sent
 * record is inserted before sending and the unique index skips duplicate events.
 * Individual email failures are logged and do not stop the remaining recipients.
 */
export async function sendPublishedArticleNewsletterAlerts(article: PublishedArticleNewsletterInput): Promise<void> {
  const activeSubscribers = await listActiveSubscribers()
  if (activeSubscribers.length === 0) return

  const { public: { siteUrl } } = useRuntimeConfig()
  const articleUrl = `${siteUrl}/articles/${article.slug}`
  const title = article.titleFr || article.titleAr

  for (const subscriber of activeSubscribers) {
    const shouldSend = await recordArticleEmailSent(article.id, subscriber.id)
    if (!shouldSend) continue

    const unsubscribeToken = createUnsubscribeToken(subscriber.id)
    const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`

    try {
      await sendNewsletterArticleAlert({
        to: subscriber.email,
        title,
        articleUrl,
        unsubscribeUrl,
      })
    }
    catch (error) {
      console.error('[newsletter] Failed to send article alert', {
        articleId: article.id,
        subscriberId: subscriber.id,
        error,
      })
    }
  }
}

function createUnsubscribeToken(subscriberId: string): string {
  const signature = signUnsubscribePayload(subscriberId)
  return `${subscriberId}.${signature}`
}

function verifyUnsubscribeToken(rawToken: string): string | null {
  const [id, signature] = rawToken.split('.')
  if (!id || !signature || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null

  const expected = signUnsubscribePayload(id)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null

  return id
}

function signUnsubscribePayload(payload: string): string {
  return createHmac('sha256', getNewsletterTokenSecret())
    .update(payload)
    .digest('base64url')
}

function getNewsletterTokenSecret(): string {
  const config = useRuntimeConfig()

  // Runtime config values are loosely typed, so keep only real strings before
  // using one as the HMAC key.
  const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

  return asString(config.newsletterTokenSecret)
    || asString(config.session?.password)
    || 'newsletter-development-secret'
}
