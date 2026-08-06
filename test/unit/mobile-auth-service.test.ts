import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MobileAuthService } from '~~/server/services/mobile-auth.service'

const mocks = vi.hoisted(() => ({
  rotate: vi.fn(),
  revokeFamily: vi.fn(),
  createRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn(),
  signAccessToken: vi.fn(),
  findFirstUser: vi.fn(),
  toSessionUser: vi.fn(),
}))

vi.mock('~~/server/repositories/mobile-auth-session.repository', () => ({
  mobileAuthSessionRepository: {
    rotate: mocks.rotate,
    revokeFamily: mocks.revokeFamily,
  },
}))

vi.mock('~~/server/utils/mobileAuthTokens', () => ({
  createRefreshToken: mocks.createRefreshToken,
  hashRefreshToken: mocks.hashRefreshToken,
  signAccessToken: mocks.signAccessToken,
}))

vi.mock('~~/server/db', () => ({
  db: {
    query: {
      users: {
        findFirst: mocks.findFirstUser,
      },
    },
  },
}))

vi.mock('~~/server/db/schema', () => ({
  users: {
    id: 'id',
  },
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}))

vi.mock('~~/server/utils/auth', () => ({
  toSessionUser: mocks.toSessionUser,
}))

describe('MobileAuthService password-change invalidation', () => {
  const sessionCreatedAt = new Date('2026-08-06T10:00:00.000Z')

  const rotatedSession = {
    id: 'session-2',
    userId: 'admin-1',
    tokenHash: 'next-refresh-hash',
    tokenFamilyId: 'family-1',
    deviceId: 'device-1',
    deviceName: 'Test phone',
    platform: 'android',
    appVersion: '1.0.0',
    pushToken: null,
    pushTokenProvider: null,
    createdAt: sessionCreatedAt,
    lastUsedAt: sessionCreatedAt,
    expiresAt: new Date('2026-09-05T10:00:00.000Z'),
    revokedAt: null,
    replacedBySessionId: null,
  }

  const admin = {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    profileCompleted: true,
    passwordChangedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mocks.createRefreshToken.mockReturnValue('next-refresh-token')
    mocks.hashRefreshToken
      .mockReturnValueOnce('current-refresh-hash')
      .mockReturnValueOnce('next-refresh-hash')

    mocks.rotate.mockResolvedValue({
      status: 'rotated',
      session: rotatedSession,
    })

    mocks.findFirstUser.mockResolvedValue(admin)

    mocks.toSessionUser.mockReturnValue({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    })

    mocks.signAccessToken.mockResolvedValue('next-access-token')
  })

  it('rejects a refresh session created before the latest password change', async () => {
    // The mobile session existed before the administrator changed the
    // password. Even if refresh-token rotation succeeds, this session must
    // never be allowed to mint a new access token.
    mocks.findFirstUser.mockResolvedValue({
      ...admin,
      passwordChangedAt: new Date('2026-08-06T10:05:00.000Z'),
    })

    const service = new MobileAuthService()

    await expect(
      service.refresh({
        refreshToken: 'current-refresh-token',
      })).rejects.toBeDefined()

    // Reject the entire refresh-token family, not only the token used by this
    // request. This prevents another token from the same rotation chain from
    // restoring access after the password change.
    expect(mocks.revokeFamily).toHaveBeenCalledOnce()
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')

    // A stale mobile session must never receive a fresh access token.
    expect(mocks.signAccessToken).not.toHaveBeenCalled()
  })

  it('allows a session created after the latest password change', async () => {
    // A new login after the password change creates a new mobile session.
    // That session is valid and must not be rejected by the stale-session
    // protection.
    mocks.findFirstUser.mockResolvedValue({
      ...admin,
      passwordChangedAt: new Date('2026-08-06T09:55:00.000Z'),
    })

    const service = new MobileAuthService()

    const result = await service.refresh({
      refreshToken: 'current-refresh-token',
    })

    expect(mocks.revokeFamily).not.toHaveBeenCalled()
    expect(mocks.signAccessToken).toHaveBeenCalled()

    expect(result.accessToken).toBe('next-access-token')
    expect(result.refreshToken).toBe('next-refresh-token')
  })
})
