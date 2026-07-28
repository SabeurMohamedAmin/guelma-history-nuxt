import { z } from 'zod'

/**
 * Validation rules for the public user-auth flows.
 *
 * These schemas are the single source of truth for username/password/email
 * shape and are reused by every handler (form register, login, and the OAuth
 * complete-profile step) so the rules can never drift between routes.
 */

/**
 * A username: 3-30 chars, letters/numbers/underscore/dot, stored lowercased.
 * Kept deliberately strict so usernames are URL- and mention-safe.
 */
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_.]+$/, 'Username may only contain letters, numbers, dot and underscore')

const email = z.string().trim().toLowerCase().email('Invalid email address').max(254)

/** A new password: min 8 chars. Upper bound guards against scrypt DoS. */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long')

/** Form sign-up: pick a username, email and password. */
export const userRegisterSchema = z.object({
  username,
  email,
  password,
})
export type UserRegisterPayload = z.infer<typeof userRegisterSchema>

/**
 * Login accepts an email OR a username in a single `identifier` field. We do
 * not validate its shape (it could be either), only that it is present; the
 * lookup is case-insensitive.
 */
export const userLoginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
})
export type UserLoginPayload = z.infer<typeof userLoginSchema>

/**
 * The persisting form shown after an OAuth sign-up: the user must choose a
 * username and set a password before the account is usable by form login.
 */
export const completeProfileSchema = z.object({
  username,
  password,
})
export type CompleteProfilePayload = z.infer<typeof completeProfileSchema>
