import { describe, expect, it } from 'vitest'
import {
  createAdminAuthorSchema,
  updateAdminAuthorSchema,
} from '~~/server/validators/author.validator'
import {
  createCategorySchema,
  updateCategorySchema,
} from '~~/server/validators/category.validator'
import { adminSubscriberStatusSchema } from '~~/server/validators/newsletter.validator'

const uuid = '4e9a1c1a-2f5b-4d0c-9a1e-8b2d3c4f5a6b'

describe('admin author validation', () => {
  it('trims required bilingual names', () => {
    expect(createAdminAuthorSchema.parse({ nameAr: '  أحمد  ', nameFr: ' Ahmed ' }))
      .toMatchObject({ nameAr: 'أحمد', nameFr: 'Ahmed' })
  })

  it('rejects missing bilingual names', () => {
    expect(() => createAdminAuthorSchema.parse({ nameAr: '', nameFr: 'Ahmed' })).toThrow()
    expect(() => createAdminAuthorSchema.parse({ nameAr: 'أحمد', nameFr: '' })).toThrow()
  })

  it('requires at least one update field', () => {
    expect(() => updateAdminAuthorSchema.parse({})).toThrow('No fields to update')
    expect(updateAdminAuthorSchema.parse({ bioFr: ' Bio ' })).toEqual({ bioFr: 'Bio' })
  })
})

describe('admin category validation', () => {
  it('accepts bilingual category data and an optional parent', () => {
    expect(createCategorySchema.parse({
      nameAr: ' روماني ',
      nameFr: ' Romaine ',
      slug: ' romaine ',
      parentId: uuid,
    })).toMatchObject({
      nameAr: 'روماني',
      nameFr: 'Romaine',
      slug: 'romaine',
      parentId: uuid,
    })
  })

  it('rejects invalid parent UUIDs', () => {
    expect(() => createCategorySchema.parse({
      nameAr: 'روماني',
      nameFr: 'Romaine',
      slug: 'romaine',
      parentId: 'invalid',
    })).toThrow()
  })

  it('allows partial updates', () => {
    expect(updateCategorySchema.parse({ nameFr: ' Antique ' })).toEqual({ nameFr: 'Antique' })
  })
})

describe('admin subscriber validation', () => {
  it('accepts only statuses supported by the admin switch', () => {
    expect(adminSubscriberStatusSchema.parse({ status: 'active' }).status).toBe('active')
    expect(adminSubscriberStatusSchema.parse({ status: 'unsubscribed' }).status).toBe('unsubscribed')
    expect(() => adminSubscriberStatusSchema.parse({ status: 'pending' })).toThrow()
  })
})
