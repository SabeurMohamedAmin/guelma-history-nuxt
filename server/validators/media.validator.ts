import { z } from 'zod'

export const deleteCloudinaryMediaSchema = z.object({
  publicId: z.string().trim().min(1).max(500).regex(/^[A-Za-z0-9/_-]+$/),
  resourceType: z.enum(['image', 'video']),
}).strict()
