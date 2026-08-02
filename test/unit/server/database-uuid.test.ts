import { describe, expect, it } from 'vitest'
import { databaseUuidSchema, isDatabaseUuid, toDatabaseUuid } from '~~/shared/database-uuid'

describe('database UUID validation', () => {
  it('accepts and normalizes random UUIDs generated for new rows', () => {
    expect(databaseUuidSchema.parse('550E8400-E29B-41D4-A716-446655440000'))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('accepts deterministic migrated UUIDs without requiring version bits', () => {
    expect(databaseUuidSchema.parse('d41d8cd9-8f00-b204-e980-0998ecf8427e'))
      .toBe('d41d8cd9-8f00-b204-e980-0998ecf8427e')
  })

  it('rejects numeric and malformed identifiers', () => {
    expect(isDatabaseUuid(42)).toBe(false)
    expect(isDatabaseUuid('42')).toBe(false)
    expect(isDatabaseUuid('not-a-uuid')).toBe(false)
  })

  it('normalizes form values without coercing invalid IDs', () => {
    expect(toDatabaseUuid(' 550E8400-E29B-41D4-A716-446655440000 '))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(toDatabaseUuid(42)).toBeNull()
    expect(toDatabaseUuid('')).toBeNull()
  })
})
