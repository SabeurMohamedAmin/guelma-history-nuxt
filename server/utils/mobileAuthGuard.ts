import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { getHeader } from 'h3'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema'
import { mobileAuthSessionRepository } from '~~/server/repositories/mobile-auth-session.repository'
import { toSessionUser, type SessionUser } from '~~/server/utils/auth'
import { verifyMobileAccessToken } from '~~/server/utils/mobileAuthTokens'

export interface MobileAdminPrincipal {
  user: SessionUser
  sessionId: string
  tokenId: string
}

/** Authenticate a Flutter request without reading or changing web cookies. */
export async function requireMobileAdmin(event: H3Event): Promise<MobileAdminPrincipal> {
  const token = readBearerToken(getHeader(event, 'authorization'))
  if (!token) throw unauthorized('Bearer access token required.')

  const claims = verifyMobileAccessToken(token)
  if (!claims) throw unauthorized('Invalid or expired access token.')

  const session = await mobileAuthSessionRepository.findActiveById(claims.sid)
  if (!session || session.userId !== claims.sub) {
    throw unauthorized('Mobile session is expired or revoked.')
  }

  const account = await db.query.users.findFirst({
    where: eq(users.id, claims.sub),
  })

  // Re-reading the account makes deletion, demotion, and verification changes
  // effective immediately instead of waiting for the access token to expire.
  if (!account || account.role !== 'admin' || !account.emailVerifiedAt || !account.profileCompleted) {
    await mobileAuthSessionRepository.revokeFamily(session.tokenFamilyId)
    throw unauthorized('Account is no longer authorized.')
  }

  if (account.passwordChangedAt && account.passwordChangedAt > session.createdAt) {
    await mobileAuthSessionRepository.revokeFamily(session.tokenFamilyId)
    throw unauthorized('Session expired after password change.')
  }

  return {
    user: toSessionUser(account),
    sessionId: session.id,
    tokenId: claims.jti,
  }
}

function readBearerToken(header: string | undefined): string | null {
  if (!header) return null
  const match = /^Bearer ([^\s]+)$/i.exec(header.trim())
  return match?.[1] ?? null
}

function unauthorized(message: string) {
  return createError({ statusCode: 401, statusMessage: 'Unauthorized', message })
}
