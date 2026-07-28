import { describe, it, expect } from 'vitest'
import { createPasswordHash, verifyPasswordHash } from '~~/server/utils/password'

describe('password primitives', () => {
  it('should successfully hash and verify a password', async () => {
    const password = 'SecretPassword123'
    const hash = await createPasswordHash(password)

    expect(hash).toContain(':')

    const isValid = await verifyPasswordHash(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject incorrect passwords', async () => {
    const password = 'SecretPassword123'
    const hash = await createPasswordHash(password)

    const isValid = await verifyPasswordHash('WrongPassword123', hash)
    expect(isValid).toBe(false)
  })
})
