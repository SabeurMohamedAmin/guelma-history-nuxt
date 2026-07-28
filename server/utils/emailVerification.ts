import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { passwordResetTokens } from '~~/server/db/schema/password-reset-tokens'

/**
 * Email-verification token lifecycle.
 *
 * Shares the `password_reset_tokens` table (discriminated by `purpose`) and the
 * same security model as password reset: a random raw token is emailed, only
 * its SHA-256 hash is stored, and tokens are single-use and time-limited.
 */

const TOKEN_BYTES = 32
const TOKEN_TTL_HOURS = 24
const PURPOSE = 'email_verification' as const

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Issue an email-verification token for a user. Invalidates any still-valid
 * verification tokens first so only the latest link works. Returns the raw
 * token to embed in the email link.
 */
export async function createEmailVerificationToken(userId: number): Promise<string> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(
      eq(passwordResetTokens.userId, userId),
      eq(passwordResetTokens.purpose, PURPOSE),
      isNull(passwordResetTokens.usedAt),
    ))

  const rawToken = randomBytes(TOKEN_BYTES).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000)

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(rawToken),
    purpose: PURPOSE,
    expiresAt,
  })

  return rawToken
}

/**
 * Consume a verification token and mark the account's email verified. Returns
 * the verified user's id on success, or null when the token is invalid/expired
 * /already used.
 */
export async function verifyEmailToken(rawToken: string): Promise<number | null> {
  const tokenRow = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, hashToken(rawToken)),
      eq(passwordResetTokens.purpose, PURPOSE),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  })

  if (!tokenRow) return null

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, tokenRow.userId))
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenRow.id))

  return tokenRow.userId
}
