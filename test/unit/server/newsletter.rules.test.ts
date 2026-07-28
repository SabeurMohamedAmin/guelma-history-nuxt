import { describe, expect, it } from 'vitest'
import {
  isConfirmationTokenValid,
  isFirstPublish,
  shouldSendConfirmationEmail,
} from '~~/server/utils/newsletterRules'

describe('newsletter rules', () => {
  describe('isFirstPublish', () => {
    it('returns true when an article changes from draft to published', () => {
      expect(isFirstPublish(null, new Date('2026-01-01T00:00:00Z'))).toBe(true)
    })

    it('returns false when a draft stays draft', () => {
      expect(isFirstPublish(null, null)).toBe(false)
    })

    it('returns false when a published article is edited', () => {
      expect(isFirstPublish(
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-01-02T00:00:00Z'),
      )).toBe(false)
    })

    it('returns false when a published article is unpublished', () => {
      expect(isFirstPublish(new Date('2026-01-01T00:00:00Z'), null)).toBe(false)
    })
  })

  describe('shouldSendConfirmationEmail', () => {
    it('sends confirmation for new, pending, and unsubscribed emails', () => {
      expect(shouldSendConfirmationEmail(null)).toBe(true)
      expect(shouldSendConfirmationEmail('pending')).toBe(true)
      expect(shouldSendConfirmationEmail('unsubscribed')).toBe(true)
    })

    it('does not send confirmation for active emails', () => {
      expect(shouldSendConfirmationEmail('active')).toBe(false)
    })
  })

  describe('isConfirmationTokenValid', () => {
    const now = new Date('2026-01-01T00:00:00Z')

    it('accepts pending tokens that have not expired', () => {
      expect(isConfirmationTokenValid('pending', new Date('2026-01-02T00:00:00Z'), now)).toBe(true)
    })

    it('rejects expired pending tokens', () => {
      expect(isConfirmationTokenValid('pending', new Date('2025-12-31T23:59:59Z'), now)).toBe(false)
    })

    it('rejects active or unsubscribed rows even when a token date exists', () => {
      const future = new Date('2026-01-02T00:00:00Z')

      expect(isConfirmationTokenValid('active', future, now)).toBe(false)
      expect(isConfirmationTokenValid('unsubscribed', future, now)).toBe(false)
    })
  })
})
