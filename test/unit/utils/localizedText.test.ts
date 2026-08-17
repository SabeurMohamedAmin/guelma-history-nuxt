import { describe, expect, it } from 'vitest'
import { pickLocalizedText } from '~~/app/utils/localizedText'

describe('pickLocalizedText', () => {
  it('returns the Arabic value for an Arabic interface', () => {
    expect(pickLocalizedText('ar', 'تاريخ قالمة', 'Histoire de Guelma'))
      .toBe('تاريخ قالمة')
  })

  it('returns the French value for a French interface', () => {
    expect(pickLocalizedText('fr', 'تاريخ قالمة', 'Histoire de Guelma'))
      .toBe('Histoire de Guelma')
  })

  it('falls back to the other language when the translation is missing', () => {
    expect(pickLocalizedText('ar', null, 'Histoire')).toBe('Histoire')
    expect(pickLocalizedText('fr', 'تاريخ', '')).toBe('تاريخ')
  })

  it('ignores a whitespace-only value so a row is never blank', () => {
    expect(pickLocalizedText('ar', '   ', 'Histoire')).toBe('Histoire')
  })

  it('returns an empty string when neither language has text', () => {
    expect(pickLocalizedText('fr', null, undefined)).toBe('')
  })
})
