import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { passwordResetTokens } from '~~/server/db/schema/password-reset-tokens'
import { createPasswordHash } from './password'

/**
 * Password reset token lifecycle.
 *
 * Security model:
 * - The raw token is random and returned only once (it goes in the email link).
 * - Only its SHA-256 hash is persisted, so a DB leak can't reset passwords.
 * - Tokens are single-use (`usedAt`) and time-limited (`expiresAt`).
 */

const TOKEN_BYTES = 32
const TOKEN_TTL_MINUTES = 30

/** Hash a raw token for storage/lookup (fast, deterministic — not a password). */
function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Issue a reset token for an admin.
 * Invalidates any still-valid tokens first so only the latest link works.
 * Returns the raw token (to embed in the email link).
 */
export async function createResetToken(userId: string): Promise<string> {
  await invalidateActiveTokens(userId)

  const rawToken = randomBytes(TOKEN_BYTES).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt,
  })

  return rawToken
}

/** Mark all unused tokens for a user as used (so they can't be reused). */
async function invalidateActiveTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)))
}

/**
 * Consume a raw token and set a new password atomically-ish:
 * validates the token is unused and unexpired, updates the password, then
 * marks the token used. Returns true on success, false if the token is invalid.
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<boolean> {
  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(rawToken)),
      // Only password-reset tokens may reset a password. The table is shared
      // with email verification, so without this an email_verification token
      // could be replayed here.
      eq(passwordResetTokens.purpose, 'reset'),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  })

  if (!tokenRow) return false

  const passwordHash = await createPasswordHash(newPassword)

  await db.update(users).set({ passwordHash }).where(eq(users.id, tokenRow.userId))
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenRow.id))

  return true
}
