import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '~~/server/db'
import { contactMessages } from '~~/server/db/schema/contact-messages'

/**
 * Contact message + verification token lifecycle.
 *
 * Security model (mirrors the password-reset flow):
 * - The raw token is random and returned only once (it goes in the email link).
 * - Only its SHA-256 hash is persisted, so a DB leak can't verify messages.
 * - Tokens are single-use (`verifiedAt`) and time-limited (`tokenExpiresAt`).
 */

const TOKEN_BYTES = 32
const TOKEN_TTL_MINUTES = 60

export interface ContactAttachment {
  filename: string
  contentType: string
  content: string
  size: number
}

export interface ContactInput {
  name: string
  email: string
  message: string
  attachments: ContactAttachment[]
}

export interface VerifiedContactMessage {
  id: string
  name: string
  email: string
  message: string
  attachments: ContactAttachment[]
}

/** Hash a raw token for storage/lookup (fast, deterministic — not a password). */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Persist a new (pending) contact message and issue a verification token.
 * Returns the raw token to embed in the verification email link.
 */
export async function createPendingMessage(input: ContactInput): Promise<{ id: string, rawToken: string }> {
  const rawToken = randomBytes(TOKEN_BYTES).toString('hex')
  const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  const [row] = await db
    .insert(contactMessages)
    .values({
      name: input.name,
      email: input.email,
      message: input.message,
      attachmentsJson: JSON.stringify(input.attachments),
      status: 'pending',
      tokenHash: hashToken(rawToken),
      tokenExpiresAt,
    })
    .returning({ id: contactMessages.id })

  return { id: row!.id, rawToken }
}

/**
 * Consume a raw verification token: validates it is unused and unexpired,
 * marks the message verified, and returns it so the caller can deliver it to
 * the site owner. Returns null when the token is invalid or expired.
 */
export async function verifyMessageToken(rawToken: string): Promise<VerifiedContactMessage | null> {
  const row = await db.query.contactMessages.findFirst({
    where: and(
      eq(contactMessages.tokenHash, hashToken(rawToken)),
      isNull(contactMessages.verifiedAt),
      gt(contactMessages.tokenExpiresAt, new Date()),
    ),
  })

  if (!row) return null

  await db
    .update(contactMessages)
    .set({ status: 'verified', verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(contactMessages.id, row.id))

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    message: row.message,
    attachments: parseAttachments(row.attachmentsJson),
  }
}

function parseAttachments(value: string | null): ContactAttachment[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value) as ContactAttachment[]
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

/** Mark a verified message as delivered to the owner. */
export async function markMessageDelivered(id: string): Promise<void> {
  await db
    .update(contactMessages)
    .set({ status: 'delivered', updatedAt: new Date() })
    .where(eq(contactMessages.id, id))
}
