import { describe, expect, it } from 'vitest'
import {
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '~~/server/validators/admin-auth.validator'

describe('admin authentication validators', () => {
  it('accepts the legacy username login field', () => {
    expect(adminLoginSchema.parse({ username: 'admin', password: 'password' }).username).toBe('admin')
  })

  it('rejects unknown login fields', () => {
    expect(() => adminLoginSchema.parse({ identifier: 'admin', password: 'password', role: 'admin' })).toThrow()
  })

  it('normalizes forgot-password email addresses', () => {
    expect(forgotPasswordSchema.parse({ email: ' ADMIN@EXAMPLE.COM ' }).email).toBe('admin@example.com')
  })

  it('rejects short reset tokens and passwords', () => {
    expect(() => resetPasswordSchema.parse({ token: 'short', password: 'short' })).toThrow()
  })
})
