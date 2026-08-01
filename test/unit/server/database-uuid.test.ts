import { describe, expect, it } from 'vitest'
import { databaseUuidSchema, isDatabaseUuid } from '~~/server/validators/database-uuid'

describe('database UUID validation', () => {
  it('accepts random UUIDs generated for new rows', () => {
    expect(databaseUuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
  })

  it('accepts deterministic migrated UUIDs without requiring version bits', () => {
    expect(databaseUuidSchema.safeParse('d41d8cd9-8f00-b204-e980-0998ecf8427e').success).toBe(true)
  })

  it('rejects numeric and malformed identifiers', () => {
    expect(isDatabaseUuid(42)).toBe(false)
    expect(isDatabaseUuid('42')).toBe(false)
    expect(isDatabaseUuid('not-a-uuid')).toBe(false)
  })
})
