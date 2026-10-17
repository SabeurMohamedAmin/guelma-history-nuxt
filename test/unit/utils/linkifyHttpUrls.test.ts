import { describe, expect, it } from 'vitest'
import { linkifyHttpUrls } from '~~/app/utils/linkifyHttpUrls'

describe('linkifyHttpUrls', () => {
  it('keeps ordinary text as text', () => {
    expect(linkifyHttpUrls('Historical account without a link.')).toEqual([
      { type: 'text', text: 'Historical account without a link.' },
    ])
  })

  it('links HTTP(S) URLs and leaves trailing punctuation outside the link', () => {
    expect(linkifyHttpUrls('Source: https://example.org/archive.')).toEqual([
      { type: 'text', text: 'Source: ' },
      { type: 'link', text: 'https://example.org/archive', href: 'https://example.org/archive' },
      { type: 'text', text: '.' },
    ])
  })

  it('links multiple URLs without losing the text between them', () => {
    expect(linkifyHttpUrls('One https://one.example then http://two.example/end')).toEqual([
      { type: 'text', text: 'One ' },
      { type: 'link', text: 'https://one.example', href: 'https://one.example/' },
      { type: 'text', text: ' then ' },
      { type: 'link', text: 'http://two.example/end', href: 'http://two.example/end' },
    ])
  })

  it('never converts javascript URLs or markup-like text into links', () => {
    expect(linkifyHttpUrls('javascript:alert(1) <img src=x onerror=alert(1)>')).toEqual([
      { type: 'text', text: 'javascript:alert(1) <img src=x onerror=alert(1)>' },
    ])
  })
})
