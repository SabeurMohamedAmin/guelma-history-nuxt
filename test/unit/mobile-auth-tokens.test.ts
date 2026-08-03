import { describe, expect, it } from 'vitest'
import {
  createMobileAccessToken,
  createMobileRefreshToken,
  hashMobileRefreshToken,
  verifyMobileAccessToken,
} from '~~/server/utils/mobileAuthTokens'
import type { MobileAuthConfig } from '~~/server/types/mobile-auth.types'

const config: MobileAuthConfig = {
  signingKey: 'test-only-signing-key-with-more-than-32-characters',
  issuer: 'test-issuer',
  audience: 'test-audience',
  accessTokenTtlSeconds: 900,
  refreshTokenTtlDays: 30,
  maxActiveDevices: 5,
}

describe('mobile authentication tokens', () => {
  it('creates and verifies a strict access token', () => {
    const created = createMobileAccessToken('user-id', 'session-id', config)
    const claims = verifyMobileAccessToken(created.token, config)

    expect(claims?.sub).toBe('user-id')
    expect(claims?.sid).toBe('session-id')
    expect(claims?.typ).toBe('access')
    expect(claims?.role).toBe('admin')
  })

  it('rejects an expired access token', () => {
    const expiredConfig = { ...config, accessTokenTtlSeconds: -1 }
    const created = createMobileAccessToken('user-id', 'session-id', expiredConfig)

    expect(verifyMobileAccessToken(created.token, config)).toBeNull()
  })

  it('rejects a token signed with another key', () => {
    const created = createMobileAccessToken('user-id', 'session-id', config)
    const otherConfig = { ...config, signingKey: `${config.signingKey}-different` }

    expect(verifyMobileAccessToken(created.token, otherConfig)).toBeNull()
  })

  it('rejects malformed and refresh tokens as access tokens', () => {
    const refresh = createMobileRefreshToken(config)

    expect(verifyMobileAccessToken('not-a-jwt', config)).toBeNull()
    expect(verifyMobileAccessToken(refresh.rawToken, config)).toBeNull()
  })

  it('hashes refresh tokens deterministically without storing the raw token', () => {
    const refresh = createMobileRefreshToken(config)

    expect(refresh.tokenHash).toBe(hashMobileRefreshToken(refresh.rawToken))
    expect(refresh.tokenHash).not.toContain(refresh.rawToken)
    expect(refresh.tokenHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
