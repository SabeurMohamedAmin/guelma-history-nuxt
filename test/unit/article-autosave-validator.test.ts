import { describe, expect, it } from 'vitest'
import {
  autosaveArticleSchema,
  revisionAwareUpdateArticleSchema,
} from '~~/server/validators/article.validator'

describe('revision-aware article update validation', () => {
  it('accepts an update with a positive expected revision', () => {
    const result = revisionAwareUpdateArticleSchema.parse({
      expectedRevision: 4,
      titleFr: 'Titre révisé',
    })

    expect(result.expectedRevision).toBe(4)
  })

  it('rejects missing, zero, fractional, and unknown revisions', () => {
    expect(() => revisionAwareUpdateArticleSchema.parse({ titleFr: 'Titre' })).toThrow()
    expect(() => revisionAwareUpdateArticleSchema.parse({ expectedRevision: 0, titleFr: 'Titre' })).toThrow()
    expect(() => revisionAwareUpdateArticleSchema.parse({ expectedRevision: 1.5, titleFr: 'Titre' })).toThrow()
    expect(() => revisionAwareUpdateArticleSchema.parse({ expectedRevision: '1', titleFr: 'Titre' })).toThrow()
  })
})

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

  it('rejects oversized draft content', () => {
    expect(() => autosaveArticleSchema.parse({
      expectedRevision: 1,
      bodyFr: 'a'.repeat(1_000_001),
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
