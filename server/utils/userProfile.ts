import { and, eq, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import type { Role } from '~~/shared/auth/roles'
import { createPasswordHash, verifyPasswordHash } from './password'

/**
 * User profile domain logic.
 *
 * Mirrors `adminProfile` but for regular `user` accounts. The avatar image is
 * stored as a blob in the `users` table and read back here so the streaming
 * endpoint can stay thin. Each function owns one responsibility and throws H3
 * errors with clear messages so the endpoints stay thin.
 */

export interface UserProfile {
  id: number
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: Date | null
  passwordChangedAt: Date | null
  role: Role
}

export interface UserAvatarImage {
  data: Buffer
  mimeType: string
  updatedAt: Date | null
}

const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function findUserOrThrow(userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'User not found.' })
  }
  return user
}

/** Read the full profile for the given user. */
export async function getUserProfile(userId: number): Promise<UserProfile> {
  const user = await findUserOrThrow(userId)
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    hasAvatar: Boolean(user.avatarData && user.avatarMimeType),
    avatarUpdatedAt: user.avatarUpdatedAt,
    passwordChangedAt: user.passwordChangedAt,
    role: user.role,
  }
}

/**
 * Read the avatar blob for the given user. Throws 404 when the user has no
 * stored picture, so the endpoint can fall back to initials on the client.
 */
export async function getUserAvatar(userId: number): Promise<UserAvatarImage> {
  const user = await findUserOrThrow(userId)

  if (!user.avatarData || !user.avatarMimeType) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Avatar not found.' })
  }

  return {
    data: Buffer.from(user.avatarData),
    mimeType: user.avatarMimeType,
    updatedAt: user.avatarUpdatedAt,
  }
}

/** Update the editable display name. */
export async function updateUserDisplayName(userId: number, displayName: string): Promise<UserProfile> {
  const trimmed = displayName.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Display name cannot be empty.' })
  }

  await db.update(users).set({ displayName: trimmed }).where(eq(users.id, userId))
  return getUserProfile(userId)
}

/** Persist a newly uploaded avatar image directly in the users table. */
export async function updateUserAvatar(userId: number, data: Buffer, mimeType: string): Promise<UserProfile> {
  await db
    .update(users)
    .set({
      avatar: null,
      avatarData: data,
      avatarMimeType: mimeType,
      avatarUpdatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  return getUserProfile(userId)
}

/**
 * Change the password. Requires the current password to be verified first,
 * and records the change time for the "last password change" display.
 */
export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await findUserOrThrow(userId)

  // `passwordHash` is null while an OAuth account has not chosen a password yet,
  // so there is nothing to re-authenticate against and the request must fail.
  if (!user.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const valid = await verifyPasswordHash(currentPassword, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  }

  const passwordHash = await createPasswordHash(newPassword)
  await db.update(users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(users.id, userId))
}

/**
 * Change the email (login credential). Requires the current password and
 * enforces uniqueness across all accounts.
 */
export async function changeUserEmail(
  userId: number,
  newEmail: string,
  currentPassword: string,
): Promise<UserProfile> {
  const user = await findUserOrThrow(userId)

  // Same rule as changeUserPassword: no stored password means no re-authentication.
  if (!user.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const valid = await verifyPasswordHash(currentPassword, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const email = newEmail.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid email address.' })
  }

  const taken = await db.query.users.findFirst({
    where: and(eq(users.email, email), ne(users.id, userId)),
  })
  if (taken) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Email is already in use.' })
  }

  await db.update(users).set({ email }).where(eq(users.id, userId))
  return getUserProfile(userId)
}
