import { describe, expect, it } from 'vitest'
import {
  mobileLoginSchema,
  mobileRefreshSchema,
} from '~~/server/validators/mobile-auth.validator'

describe('mobile authentication validation', () => {
  it('accepts supported Flutter device metadata', () => {
    const result = mobileLoginSchema.safeParse({
      identifier: 'admin@example.com',
      password: 'not-logged-or-persisted',
      deviceId: 'flutter-installation-id',
      deviceName: 'Admin phone',
      platform: 'android',
      appVersion: '1.0.0',
    })

    expect(result.success).toBe(true)
  })

  it('rejects unsupported platforms and unknown fields', () => {
    expect(mobileLoginSchema.safeParse({
      identifier: 'admin',
      password: 'password',
      deviceId: 'device',
      platform: 'web',
    }).success).toBe(false)

    expect(mobileRefreshSchema.safeParse({
      refreshToken: 'a'.repeat(32),
      accessToken: 'must-not-be-accepted',
    }).success).toBe(false)
  })

  it('rejects short or oversized refresh tokens', () => {
    expect(mobileRefreshSchema.safeParse({ refreshToken: 'short' }).success).toBe(false)
    expect(mobileRefreshSchema.safeParse({ refreshToken: 'a'.repeat(513) }).success).toBe(false)
  })
})
