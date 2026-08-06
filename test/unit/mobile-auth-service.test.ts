import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Refresh-path authorization rules for the Flutter admin API.
 *
 * The repository, the token helpers and the database are mocked, so this suite
 * covers the SERVICE decisions only: which refresh attempts may mint a new
 * access token, and which revoke the whole refresh-token family.
 */

const mocks = vi.hoisted(() => ({
  rotate: vi.fn(),
  revokeFamily: vi.fn(),
  createMobileAccessToken: vi.fn(),
  createMobileRefreshToken: vi.fn(),
  getMobileAuthConfig: vi.fn(),
  hashMobileRefreshToken: vi.fn(),
  authenticateAdmin: vi.fn(),
  toSessionUser: vi.fn(),
  findFirstUser: vi.fn(),
}))

vi.mock('~~/server/repositories/mobile-auth-session.repository', () => ({
  mobileAuthSessionRepository: {
    rotate: mocks.rotate,
    revokeFamily: mocks.revokeFamily,
  },
}))

// Every export the service imports must exist on the mock factory, otherwise
// the module under test fails to load.
vi.mock('~~/server/utils/mobileAuthTokens', () => ({
  createMobileAccessToken: mocks.createMobileAccessToken,
  createMobileRefreshToken: mocks.createMobileRefreshToken,
  getMobileAuthConfig: mocks.getMobileAuthConfig,
  hashMobileRefreshToken: mocks.hashMobileRefreshToken,
}))

vi.mock('~~/server/utils/auth', () => ({
  authenticateAdmin: mocks.authenticateAdmin,
  toSessionUser: mocks.toSessionUser,
}))

vi.mock('~~/server/db', () => ({
  db: { query: { users: { findFirst: mocks.findFirstUser } } },
}))

vi.mock('~~/server/db/schema', () => ({ users: { id: 'id' } }))

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

interface TestError extends Error {
  statusCode?: number
}

// `createError` is a Nitro auto-import and does not exist in the plain-node
// unit project.
Object.assign(globalThis, {
  createError: (input: { statusCode: number, message?: string }): TestError => {
    const error: TestError = new Error(input.message ?? 'Error')
    error.statusCode = input.statusCode
    return error
  },
})

const { MobileAuthService } = await import('~~/server/services/mobile-auth.service')

// The validator is real: anything shorter than 32 characters is rejected
// before a single authorization rule runs.
const REFRESH_TOKEN = 'r'.repeat(64)

const TOKEN_ISSUED_AT = new Date('2026-08-06T10:00:00.000Z')
const ROTATED_AT = new Date('2026-08-06T12:00:00.000Z')

/**
 * Mirrors the repository contract: `session` is the replacement row inserted
 * by this rotation, while `refreshTokenIssuedAt` describes the token the
 * client actually presented.
 */
function rotatedResult(refreshTokenIssuedAt = TOKEN_ISSUED_AT) {
  return {
    status: 'rotated',
    session: {
      id: 'session-2',
      userId: 'admin-1',
      tokenFamilyId: 'family-1',
      createdAt: ROTATED_AT,
    },
    refreshTokenIssuedAt,
  }
}

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    profileCompleted: true,
    passwordChangedAt: null,
    ...overrides,
  }
}

function refresh() {
  return new MobileAuthService().refresh({ refreshToken: REFRESH_TOKEN })
}

describe('MobileAuthService.refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.hashMobileRefreshToken.mockReturnValue('current-refresh-hash')
    mocks.createMobileRefreshToken.mockReturnValue({
      rawToken: 'next-refresh-token',
      tokenHash: 'next-refresh-hash',
      expiresAt: new Date('2026-09-05T12:00:00.000Z'),
    })
    mocks.createMobileAccessToken.mockReturnValue({
      token: 'next-access-token',
      expiresAt: new Date('2026-08-06T12:15:00.000Z'),
    })

    mocks.rotate.mockResolvedValue(rotatedResult())
    mocks.findFirstUser.mockResolvedValue(adminRow())
    mocks.toSessionUser.mockImplementation((row: { id: string, email: string, role: string }) => ({
      id: row.id,
      email: row.email,
      role: row.role,
    }))
  })

  it('rotates the refresh token and issues a new access token', async () => {
    const result = await refresh()

    expect(result.accessToken).toBe('next-access-token')
    expect(result.refreshToken).toBe('next-refresh-token')
    expect(result.tokenType).toBe('Bearer')
    expect(mocks.revokeFamily).not.toHaveBeenCalled()
  })

  it('rejects a refresh token issued before the latest password change', async () => {
    // The password changed at 11:00, AFTER the presented token was issued at
    // 10:00 but BEFORE the replacement row created at 12:00. Comparing against
    // the replacement row would wrongly accept this request, which is exactly
    // the regression this test locks down.
    mocks.findFirstUser.mockResolvedValue(adminRow({
      passwordChangedAt: new Date('2026-08-06T11:00:00.000Z'),
    }))

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })

    // Revoke the whole family so another token from the same rotation chain
    // cannot restore access after the password change.
    expect(mocks.revokeFamily).toHaveBeenCalledOnce()
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
    expect(mocks.createMobileAccessToken).not.toHaveBeenCalled()
  })

  it('allows a refresh token issued after the latest password change', async () => {
    // A fresh login after the password change is legitimate.
    mocks.findFirstUser.mockResolvedValue(adminRow({
      passwordChangedAt: new Date('2026-08-06T09:00:00.000Z'),
    }))

    const result = await refresh()

    expect(result.accessToken).toBe('next-access-token')
    expect(mocks.revokeFamily).not.toHaveBeenCalled()
  })

  it('rejects a demoted account and revokes its token family', async () => {
    mocks.findFirstUser.mockResolvedValue(adminRow({ role: 'author' }))

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects an unverified or incomplete account and revokes its token family', async () => {
    mocks.findFirstUser.mockResolvedValue(adminRow({ emailVerifiedAt: null }))

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects a reused refresh token without reading the account', async () => {
    // The repository already revoked the family when it detected the reuse.
    mocks.rotate.mockResolvedValue({ status: 'reuse-detected' })

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.findFirstUser).not.toHaveBeenCalled()
    expect(mocks.createMobileAccessToken).not.toHaveBeenCalled()
  })

  it('rejects an unknown or expired refresh token', async () => {
    mocks.rotate.mockResolvedValue({ status: 'invalid' })

    await expect(refresh()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createMobileAccessToken).not.toHaveBeenCalled()
  })

  it('rejects a refresh token that is too short to be valid', async () => {
    await expect(new MobileAuthService().refresh({ refreshToken: 'too-short' }))
      .rejects.toBeDefined()
    expect(mocks.rotate).not.toHaveBeenCalled()
  })
})
