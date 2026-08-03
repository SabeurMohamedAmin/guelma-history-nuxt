import { describe, expect, it } from 'vitest'
import { autosaveArticleSchema } from '~~/server/validators/article.validator'

describe('article autosave validation', () => {
  it('accepts bilingual draft text with the expected revision', () => {
    const result = autosaveArticleSchema.parse({
      expectedRevision: 3,
      titleAr: 'عنوان محفوظ',
      bodyFr: 'Contenu de brouillon',
    })

    expect(result.expectedRevision).toBe(3)
    expect(result.titleAr).toBe('عنوان محفوظ')
  })

  it('accepts clearing an optional excerpt', () => {
    expect(autosaveArticleSchema.parse({
      expectedRevision: 1,
      excerptFr: null,
    }).excerptFr).toBeNull()
  })

  it('rejects an empty save', () => {
    expect(() => autosaveArticleSchema.parse({ expectedRevision: 1 })).toThrow()
  })

  it('rejects missing and invalid revisions', () => {
    expect(() => autosaveArticleSchema.parse({ titleFr: 'Brouillon' })).toThrow()
    expect(() => autosaveArticleSchema.parse({ expectedRevision: 0, titleFr: 'Brouillon' })).toThrow()
  })

  it.each([
    ['publishedAt', new Date().toISOString()],
    ['media', []],
    ['categoryId', null],
    ['authorId', null],
    ['slug', 'unsafe-change'],
    ['homePosition', 0],
  ])('rejects structural or publishing field %s', (field, value) => {
    expect(() => autosaveArticleSchema.parse({
      expectedRevision: 1,
      titleFr: 'Brouillon',
      [field]: value,
    })).toThrow()
  })

  it('preserves Arabic and French content', () => {
    const result = autosaveArticleSchema.parse({
      expectedRevision: 7,
      bodyAr: '<p dir="rtl">تاريخ قالمة</p>',
      bodyFr: '<p>Histoire de Guelma</p>',
    })

    expect(result.bodyAr).toBe('<p dir="rtl">تاريخ قالمة</p>')
    expect(result.bodyFr).toBe('<p>Histoire de Guelma</p>')
  })
})
