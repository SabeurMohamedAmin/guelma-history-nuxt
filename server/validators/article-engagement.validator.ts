import { z } from 'zod'
import { articleSlugSchema } from './slug'

// Articles are referenced by their public slug — see server/validators/slug.ts.

export const articleCommentSchema = z.object({
  articleSlug: articleSlugSchema,
  name: z.string().trim().min(2, 'Name is too short').max(120),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254).optional().or(z.literal('')),
  message: z.string().trim().min(3, 'Comment is too short').max(2000),
})

export const articleCorrectionRequestSchema = z.object({
  articleSlug: articleSlugSchema,
  name: z.string().trim().min(2, 'Name is too short').max(120),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(254),
  section: z.string().trim().max(180).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Correction request is too short').max(3000),
})
