import { contactSchema, isBlockedAttachmentName } from '~~/server/validators/contact.validator'
import { createPendingMessage } from '~~/server/utils/contact'
import { sendContactVerificationEmail } from '~~/server/utils/email/contact-verify'
import { toH3Error } from '~~/server/utils/handleError'
import { validateContactAttachment } from '~~/server/utils/contactAttachmentValidation'

const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024
const MAX_ATTACHMENT_COUNT = 5

/**
 * POST /api/contact/submit
 * Stores a pending contact message and emails the sender a verification link.
 * The message is NOT delivered to the owner until the link is clicked.
 */
export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)

    if (!form) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid contact form data.' })
    }

    const textValue = (name: string) => form.find(part => part.name === name && !part.filename)?.data.toString('utf8') ?? ''
    const fileParts = form.filter(part => part.name === 'files' && part.filename)
    const totalFileBytes = fileParts.reduce((total, part) => total + part.data.length, 0)

    if (fileParts.length > MAX_ATTACHMENT_COUNT) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.` })
    }

    if (totalFileBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Attachments must be 50 MB or less in total.' })
    }

    const attachments = fileParts.map((part) => {
      if (!part.filename) {
        throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid attachment.' })
      }

      if (isBlockedAttachmentName(part.filename)) {
        throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Executable files are not allowed.' })
      }

      validateContactAttachment(part.data, part.type)

      return {
        filename: part.filename,
        contentType: part.type || 'application/octet-stream',
        content: part.data.toString('base64'),
        size: part.data.length,
      }
    })

    const input = contactSchema.parse({
      name: textValue('name'),
      email: textValue('email'),
      message: textValue('message'),
      attachments,
    })

    const { rawToken } = await createPendingMessage(input)

    const { public: { siteUrl } } = useRuntimeConfig()
    const verifyUrl = `${siteUrl}/contact/verify?token=${rawToken}`

    await sendContactVerificationEmail(input.email, input.name, verifyUrl)

    return { message: 'A verification email has been sent. Please check your inbox to confirm and send your message.' }
  }
  catch (error) {
    return toH3Error(error)
  }
})
