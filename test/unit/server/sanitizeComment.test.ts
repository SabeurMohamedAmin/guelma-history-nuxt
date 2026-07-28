import { describe, it, expect } from 'vitest'
import { sanitizeCommentBody } from '~~/server/utils/sanitizeComment'

describe('sanitizeCommentBody', () => {
  it('keeps normal text and trims surrounding whitespace', () => {
    expect(sanitizeCommentBody('  hello world  ')).toBe('hello world')
  })

  it('preserves Arabic (RTL) and French (LTR) content unchanged', () => {
    expect(sanitizeCommentBody('مرحبا بالعالم')).toBe('مرحبا بالعالم')
    expect(sanitizeCommentBody('Bonjour le monde')).toBe('Bonjour le monde')
  })

  it('normalizes CRLF and CR newlines to LF', () => {
    expect(sanitizeCommentBody('a\r\nb\rc')).toBe('a\nb\nc')
  })

  it('strips control characters but keeps tabs and newlines', () => {
    expect(sanitizeCommentBody('a\u0000b\u0007c')).toBe('abc')
    expect(sanitizeCommentBody('a\tb\nc')).toBe('a\tb\nc')
  })

  it('strips zero-width and bidi-override characters', () => {
    // Zero-width space + right-to-left override hidden inside text.
    expect(sanitizeCommentBody('he\u200bllo\u202e')).toBe('hello')
  })

  it('reduces an all-invisible string to empty (so validation can reject it)', () => {
    expect(sanitizeCommentBody('\u200b\u200b\ufeff')).toBe('')
  })

  it('collapses 3+ blank lines to a single blank line', () => {
    expect(sanitizeCommentBody('a\n\n\n\nb')).toBe('a\n\nb')
  })

  it('trims trailing spaces on each line', () => {
    expect(sanitizeCommentBody('a   \nb')).toBe('a\nb')
  })
})
