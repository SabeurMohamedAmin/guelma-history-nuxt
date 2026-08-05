import { z } from 'zod'

const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024
const MAX_ATTACHMENT_COUNT = 5
const BLOCKED_ATTACHMENT_EXTENSIONS = ['.apk', '.app', '.bat', '.bin', '.cmd', '.com', '.dll', '.dmg', '.exe', '.jar', '.msi', '.scr', '.sh']

export interface ContactAttachmentInput {
  filename: string
  contentType: string
  content: string
  size: number
}

/** Validation schema for an incoming contact form submission. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254),
  message: z.string().trim().min(10, 'Message is too short').max(5000),
  attachments: z.array(z.object({
    filename: z.string()
      .trim()
      .min(1)
      .max(255)
      .refine(name => !/[\u0000-\u001F\u007F/\\]/.test(name), 'Invalid attachment filename'),
    contentType: z.string().trim().min(1).max(255),
    content: z.string().min(1).max(Math.ceil(MAX_TOTAL_ATTACHMENT_BYTES * 4 / 3) + 4),
    size: z.number().int().positive().max(MAX_TOTAL_ATTACHMENT_BYTES),
  }).strict()).max(MAX_ATTACHMENT_COUNT, `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`).default([]),
}).strict().superRefine((value, context) => {
  const totalSize = value.attachments.reduce((total, file) => total + file.size, 0)

  if (totalSize > MAX_TOTAL_ATTACHMENT_BYTES) {
    context.addIssue({
      code: 'custom',
      path: ['attachments'],
      message: 'Attachments must be 50 MB or less in total.',
    })
  }

  for (const attachment of value.attachments) {
    const decodedSize = Buffer.byteLength(attachment.content, 'base64')
    if (decodedSize !== attachment.size) {
      context.addIssue({
        code: 'custom',
        path: ['attachments'],
        message: 'Attachment size does not match its content.',
      })
    }

    if (isBlockedAttachmentName(attachment.filename)) {
      context.addIssue({
        code: 'custom',
        path: ['attachments'],
        message: 'Executable files are not allowed.',
      })
    }
  }
})

export type ContactPayload = z.infer<typeof contactSchema>

export function isBlockedAttachmentName(filename: string): boolean {
  const lowerName = filename.trim().toLowerCase()
  const parts = lowerName.split('.').slice(1)
  return BLOCKED_ATTACHMENT_EXTENSIONS.some(extension =>
    parts.includes(extension.slice(1)),
  )
}
