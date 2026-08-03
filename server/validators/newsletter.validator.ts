import { z } from 'zod'

/** Validation schema for a newsletter subscription request. */
export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254),
})

/**
 * Backwards-compatible alias used by the existing subscribe endpoint.
 * New code should prefer `newsletterSubscribeSchema` for clearer intent.
 */
export const newsletterSchema = newsletterSubscribeSchema

/** Shared token validator for confirmation and unsubscribe links. */
const newsletterTokenSchema = z.string()
  .trim()
  .min(32, 'Invalid token')
  .max(256, 'Invalid token')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid token')

/** Validation schema for confirming a pending newsletter subscription. */
export const newsletterConfirmSchema = z.object({
  token: newsletterTokenSchema,
})

/** Validation schema for unsubscribing from article alert emails. */
export const newsletterUnsubscribeSchema = z.object({
  token: newsletterTokenSchema,
})

export const adminSubscriberStatusSchema = z.object({
  status: z.enum(['active', 'unsubscribed']),
})

export type AdminSubscriberStatusPayload = z.infer<typeof adminSubscriberStatusSchema>
export type NewsletterSubscribePayload = z.infer<typeof newsletterSubscribeSchema>
export type NewsletterConfirmPayload = z.infer<typeof newsletterConfirmSchema>
export type NewsletterUnsubscribePayload = z.infer<typeof newsletterUnsubscribeSchema>

/** Backwards-compatible type alias used by older code. */
export type NewsletterPayload = NewsletterSubscribePayload
