import { describe, expect, it } from 'vitest'
import { registerDeviceTokenSchema } from '~~/server/validators/mobile-device-token.validator'

describe('mobile device push token validation', () => {
  it('accepts valid FCM push tokens', () => {
    const result = registerDeviceTokenSchema.safeParse({
      pushToken: 'fcm_test_token_1234567890',
      provider: 'fcm',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pushToken).toBe('fcm_test_token_1234567890')
      expect(result.data.provider).toBe('fcm')
    }
  })

  it('defaults provider to fcm when omitted', () => {
    const result = registerDeviceTokenSchema.safeParse({
      pushToken: 'apns_test_token_9876543210',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe('fcm')
    }
  })

  it('rejects empty or whitespace-only push tokens', () => {
    const result = registerDeviceTokenSchema.safeParse({
      pushToken: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects tokens exceeding max length', () => {
    const result = registerDeviceTokenSchema.safeParse({
      pushToken: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown provider values and unrecognized body properties', () => {
    const result = registerDeviceTokenSchema.safeParse({
      pushToken: 'valid_token',
      provider: 'webpush',
    })
    expect(result.success).toBe(false)

    const strictResult = registerDeviceTokenSchema.safeParse({
      pushToken: 'valid_token',
      extraProperty: 'forbidden',
    })
    expect(strictResult.success).toBe(false)
  })
})
