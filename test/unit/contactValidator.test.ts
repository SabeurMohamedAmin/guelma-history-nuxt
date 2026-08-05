import { describe, expect, it } from 'vitest'
import { contactSchema, isBlockedAttachmentName } from '~~/server/validators/contact.validator'

const baseContact = {
  name: 'Example User',
  email: 'user@example.com',
  message: 'This is a valid contact message.',
}

describe('contact validator', () => {
  it('blocks dangerous compound extensions', () => {
    expect(isBlockedAttachmentName('invoice.exe.txt')).toBe(true)
  })

  it('rejects path separators in attachment names', () => {
    expect(() => contactSchema.parse({
      ...baseContact,
      attachments: [{
        filename: '../note.txt',
        contentType: 'text/plain',
        content: Buffer.from('hello').toString('base64'),
        size: 5,
      }],
    })).toThrow()
  })

  it('rejects attachment size mismatches', () => {
    expect(() => contactSchema.parse({
      ...baseContact,
      attachments: [{
        filename: 'note.txt',
        contentType: 'text/plain',
        content: Buffer.from('hello').toString('base64'),
        size: 4,
      }],
    })).toThrow()
  })
})
