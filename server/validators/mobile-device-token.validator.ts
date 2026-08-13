import { z } from 'zod'

export const registerDeviceTokenSchema = z.object({
  pushToken: z
    .string()
    .trim()
    .min(1, 'Push token cannot be empty')
    .max(500, 'Push token is too long'),
  provider: z.enum(['fcm', 'apns']).default('fcm'),
}).strict()

export type RegisterDeviceTokenPayload = z.infer<typeof registerDeviceTokenSchema>
