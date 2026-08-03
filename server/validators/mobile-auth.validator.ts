import { z } from 'zod'

const trimmedText = (maximum: number) => z.string().trim().min(1).max(maximum)

export const mobileLoginSchema = z.object({
  identifier: trimmedText(254),
  password: z.string().min(1).max(1024),
  deviceId: trimmedText(200),
  deviceName: z.string().trim().max(200).optional(),
  platform: z.enum(['android', 'ios']),
  appVersion: z.string().trim().max(50).optional(),
}).strict()

export const mobileRefreshSchema = z.object({
  refreshToken: z.string().min(32).max(512),
}).strict()

export type MobileLoginInput = z.infer<typeof mobileLoginSchema>
