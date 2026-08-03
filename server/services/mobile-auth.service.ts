import { randomUUID } from 'node:crypto'
import { authenticateAdmin } from '~~/server/utils/auth'
import {
  createMobileAccessToken,
  createMobileRefreshToken,
  getMobileAuthConfig,
  hashMobileRefreshToken,
} from '~~/server/utils/mobileAuthTokens'
import { mobileAuthSessionRepository } from '~~/server/repositories/mobile-auth-session.repository'
import {
  mobileLoginSchema,
  mobileRefreshSchema,
} from '~~/server/validators/mobile-auth.validator'

function unauthorized(message = 'Invalid credentials.') {
  return createError({ statusCode: 401, statusMessage: 'Unauthorized', message })
}

export class MobileAuthService {
  async login(input: unknown) {
    const data = mobileLoginSchema.parse(input)
    const admin = await authenticateAdmin(data.identifier, data.password)
    if (!admin) throw unauthorized()
    if (!admin.profileCompleted) throw unauthorized()

    // Opportunistic cleanup avoids requiring a pipeline or public maintenance
    // endpoint. Failure is allowed to abort login rather than hide DB problems.
    await mobileAuthSessionRepository.deleteExpired()

    const refreshToken = createMobileRefreshToken()
    const session = await mobileAuthSessionRepository.create({
      userId: admin.id,
      tokenHash: refreshToken.tokenHash,
      tokenFamilyId: randomUUID(),
      deviceId: data.deviceId,
      deviceName: optionalText(data.deviceName),
      platform: data.platform,
      appVersion: optionalText(data.appVersion),
      expiresAt: refreshToken.expiresAt,
    }, getMobileAuthConfig().maxActiveDevices)
    if (!session) throw createError({ statusCode: 500, message: 'Mobile session could not be created.' })

    return this.createTokenResponse(admin, session.id, refreshToken.rawToken, refreshToken.expiresAt)
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await mobileAuthSessionRepository.listActiveForUser(userId)
    return sessions
      .filter(session => session.expiresAt > new Date())
      .map(session => ({
        id: session.id,
        deviceId: session.deviceId,
        deviceName: session.deviceName,
        platform: session.platform,
        appVersion: session.appVersion,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        current: session.id === currentSessionId,
      }))
  }

  async logoutCurrent(userId: string, sessionId: string): Promise<void> {
    await mobileAuthSessionRepository.revokeByIdForUser(sessionId, userId)
  }

  async logoutAll(userId: string): Promise<number> {
    return mobileAuthSessionRepository.revokeAllForUser(userId)
  }

  async revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
    if (sessionId === currentSessionId) {
      throw createError({ statusCode: 409, message: 'Use logout to revoke the current session.' })
    }
    if (!await mobileAuthSessionRepository.revokeByIdForUser(sessionId, userId)) {
      throw createError({ statusCode: 404, message: 'Mobile session not found.' })
    }
  }

  async refresh(input: unknown) {
    const data = mobileRefreshSchema.parse(input)
    const nextToken = createMobileRefreshToken()
    const result = await mobileAuthSessionRepository.rotate({
      currentTokenHash: hashMobileRefreshToken(data.refreshToken),
      nextTokenHash: nextToken.tokenHash,
      nextExpiresAt: nextToken.expiresAt,
    })

    if (result.status === 'reuse-detected') {
      throw unauthorized('Refresh-token reuse detected. Please log in again.')
    }
    if (result.status === 'invalid') throw unauthorized('Invalid or expired refresh token.')

    // The account is re-read during every refresh. Deleted, unverified, or
    // demoted accounts cannot obtain a new access token.
    const admin = await this.findActiveAdmin(result.session.userId)
    if (!admin) {
      await mobileAuthSessionRepository.revokeFamily(result.session.tokenFamilyId)
      throw unauthorized('Account is no longer authorized.')
    }

    return this.createTokenResponse(admin, result.session.id, nextToken.rawToken, nextToken.expiresAt)
  }

  private async findActiveAdmin(userId: string) {
    const { db } = await import('~~/server/db')
    const { users } = await import('~~/server/db/schema')
    const { eq } = await import('drizzle-orm')
    const row = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!row || row.role !== 'admin' || !row.emailVerifiedAt || !row.profileCompleted) return null

    const { toSessionUser } = await import('~~/server/utils/auth')
    return toSessionUser(row)
  }

  private createTokenResponse(
    admin: Awaited<ReturnType<typeof authenticateAdmin>> & {},
    sessionId: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ) {
    const access = createMobileAccessToken(admin.id, sessionId)
    return {
      tokenType: 'Bearer' as const,
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: admin,
    }
  }
}

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed || null
}

export const mobileAuthService = new MobileAuthService()
