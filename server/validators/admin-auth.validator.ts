import { z } from 'zod'

const passwordSchema = z.string().min(1).max(1024)

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(254).optional(),
  username: z.string().trim().min(1).max(254).optional(),
  password: passwordSchema,
}).strict().refine(input => Boolean(input.identifier || input.username), {
  message: 'Username or email is required.',
  path: ['identifier'],
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
}).strict()

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(512),
  password: passwordSchema.min(8),
}).strict()
