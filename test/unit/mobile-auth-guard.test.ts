import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MobileAuthConfig } from '~~/server/types/mobile-auth.types'

/**
 * Authorization contract for the Flutter bearer guard.
 *
 * `server/middleware/privileged-api-auth.ts` sends every protected
 * `/api/v1/admin/**` request through `requireMobileAdmin()`, so a rejection
 * proven here is a rejection for all of those endpoints.
 *
 * Only the database and the session repository are mocked. Token creation and
 * verification run for real, so an expired or wrong-type token is rejected by
 * the same code the server uses.
 */

const mocks = vi.hoisted(() => ({
  findActiveById: vi.fn(),
  revokeFamily: vi.fn(),
  findFirstUser: vi.fn(),
}))

// The guard only reads the Authorization header, so a tiny fake keeps the test
// independent from the H3 request object shape.
vi.mock('h3', () => ({
  getHeader: (event: { headers: Record<string, string> }, name: string) =>
    event.headers[name.toLowerCase()],
}))

vi.mock('~~/server/repositories/mobile-auth-session.repository', () => ({
  mobileAuthSessionRepository: {
    findActiveById: mocks.findActiveById,
    revokeFamily: mocks.revokeFamily,
  },
}))

vi.mock('~~/server/db', () => ({
  db: { query: { users: { findFirst: mocks.findFirstUser } } },
}))

vi.mock('~~/server/db/schema', () => ({ users: { id: 'id' } }))

vi.mock('drizzle-orm', () => ({ eq: vi.fn() }))

vi.mock('~~/server/utils/auth', () => ({
  toSessionUser: (account: { id: string, email: string, role: string }) => ({
    id: account.id,
    email: account.email,
    role: account.role,
  }),
}))

const config: MobileAuthConfig = {
  signingKey: 'test-only-signing-key-with-more-than-32-characters',
  issuer: 'test-issuer',
  audience: 'test-audience',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlDays: 30,
  maxActiveDevices: 5,
}

interface TestError extends Error {
  statusCode?: number
  statusMessage?: string
}

// `useRuntimeConfig` and `createError` are Nitro auto-imports and do not exist
// in the plain-node unit project. Both are only called at request time, so
// installing them here is enough.
Object.assign(globalThis, {
  useRuntimeConfig: () => ({ mobileAuth: config }),
  createError: (input: { statusCode: number, statusMessage?: string, message?: string }): TestError => {
    const error: TestError = new Error(input.message ?? input.statusMessage ?? 'Error')
    error.statusCode = input.statusCode
    error.statusMessage = input.statusMessage
    return error
  },
})

const { requireMobileAdmin } = await import('~~/server/utils/mobileAuthGuard')
const { createMobileAccessToken, createMobileRefreshToken } = await import('~~/server/utils/mobileAuthTokens')

const SESSION_CREATED_AT = new Date('2026-08-06T10:00:00.000Z')

function activeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: 'admin-1',
    tokenFamilyId: 'family-1',
    createdAt: SESSION_CREATED_AT,
    ...overrides,
  }
}

function adminAccount(overrides: Record<string, unknown> = {}) {
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

function eventWithHeaders(headers: Record<string, string>): H3Event {
  return { headers } as unknown as H3Event
}

function bearerEvent(token: string): H3Event {
  return eventWithHeaders({ authorization: `Bearer ${token}` })
}

function validAccessToken(): string {
  return createMobileAccessToken('admin-1', 'session-1', config).token
}

describe('requireMobileAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findActiveById.mockResolvedValue(activeSession())
    mocks.findFirstUser.mockResolvedValue(adminAccount())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a verified admin and returns the authenticated principal', async () => {
    const principal = await requireMobileAdmin(bearerEvent(validAccessToken()))

    expect(principal.user.role).toBe('admin')
    expect(principal.sessionId).toBe('session-1')
    expect(principal.tokenId).toBeTruthy()
    expect(mocks.revokeFamily).not.toHaveBeenCalled()
  })

  it('rejects a request without a bearer token', async () => {
    await expect(requireMobileAdmin(eventWithHeaders({}))).rejects.toMatchObject({ statusCode: 401 })

    // No token means no session lookup: an anonymous caller must never reach
    // the database.
    expect(mocks.findActiveById).not.toHaveBeenCalled()
  })

  it('rejects a malformed authorization header', async () => {
    const token = validAccessToken()

    await expect(requireMobileAdmin(eventWithHeaders({ authorization: token })))
      .rejects.toMatchObject({ statusCode: 401 })
    await expect(requireMobileAdmin(eventWithHeaders({ authorization: `Token ${token}` })))
      .rejects.toMatchObject({ statusCode: 401 })
    await expect(requireMobileAdmin(eventWithHeaders({ authorization: 'Bearer' })))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('never accepts a refresh token as an access token', async () => {
    const refresh = createMobileRefreshToken(config)

    await expect(requireMobileAdmin(bearerEvent(refresh.rawToken)))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.findActiveById).not.toHaveBeenCalled()
  })

  it('rejects an expired access token', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-06T10:00:00.000Z'))

    const token = validAccessToken()

    // One second past the configured 15 minute lifetime.
    vi.setSystemTime(new Date('2026-08-06T10:15:01.000Z'))

    await expect(requireMobileAdmin(bearerEvent(token))).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.findActiveById).not.toHaveBeenCalled()
  })

  it('rejects a revoked or expired device session', async () => {
    mocks.findActiveById.mockResolvedValue(null)

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })

    // The session is already gone, so there is no family left to revoke.
    expect(mocks.revokeFamily).not.toHaveBeenCalled()
  })

  it('rejects a session that belongs to another account', async () => {
    mocks.findActiveById.mockResolvedValue(activeSession({ userId: 'other-admin' }))

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.findFirstUser).not.toHaveBeenCalled()
  })

  it('rejects a deleted account and revokes its token family', async () => {
    mocks.findFirstUser.mockResolvedValue(undefined)

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects a demoted account and revokes its token family', async () => {
    // Role changes must take effect immediately instead of waiting for the
    // access token to expire.
    mocks.findFirstUser.mockResolvedValue(adminAccount({ role: 'author' }))

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects an unverified email address and revokes its token family', async () => {
    mocks.findFirstUser.mockResolvedValue(adminAccount({ emailVerifiedAt: null }))

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects an incomplete profile and revokes its token family', async () => {
    mocks.findFirstUser.mockResolvedValue(adminAccount({ profileCompleted: false }))

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('rejects a session created before the latest password change', async () => {
    mocks.findFirstUser.mockResolvedValue(adminAccount({
      passwordChangedAt: new Date('2026-08-06T10:05:00.000Z'),
    }))

    await expect(requireMobileAdmin(bearerEvent(validAccessToken())))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.revokeFamily).toHaveBeenCalledWith('family-1')
  })

  it('accepts a session created after the latest password change', async () => {
    // A fresh login after the password change is legitimate and must keep
    // working.
    mocks.findFirstUser.mockResolvedValue(adminAccount({
      passwordChangedAt: new Date('2026-08-06T09:55:00.000Z'),
    }))

    const principal = await requireMobileAdmin(bearerEvent(validAccessToken()))

    expect(principal.sessionId).toBe('session-1')
    expect(mocks.revokeFamily).not.toHaveBeenCalled()
  })
})
