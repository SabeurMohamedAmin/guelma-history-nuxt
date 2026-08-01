import { and, eq, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import type { Role } from '~~/shared/auth/roles'
import { createPasswordHash, verifyPasswordHash } from './password'

/**
 * Admin profile domain logic.
 *
 * Each function owns one responsibility and throws H3 errors with clear
 * messages. Endpoints stay thin and simply delegate here.
 */

export interface AdminProfile {
  id: string
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: Date | null
  passwordChangedAt: Date | null
  role: Role
}

export interface AdminAvatarImage {
  data: Buffer
  mimeType: string
  updatedAt: Date | null
}

const MIN_PASSWORD_LENGTH = 8
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function findAdminOrThrow(adminId: string) {
  const admin = await db.query.users.findFirst({ where: eq(users.id, adminId) })
  if (!admin) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Admin not found.' })
  }
  return admin
}

/** Read the full profile for the given admin. */
export async function getAdminProfile(adminId: string): Promise<AdminProfile> {
  const admin = await findAdminOrThrow(adminId)
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    displayName: admin.displayName,
    hasAvatar: Boolean(admin.avatarData && admin.avatarMimeType),
    avatarUpdatedAt: admin.avatarUpdatedAt,
    passwordChangedAt: admin.passwordChangedAt,
    role: admin.role,
  }
}

export async function getAdminAvatar(adminId: string): Promise<AdminAvatarImage> {
  const admin = await findAdminOrThrow(adminId)

  if (!admin.avatarData || !admin.avatarMimeType) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Avatar not found.' })
  }

  return {
    data: Buffer.from(admin.avatarData),
    mimeType: admin.avatarMimeType,
    updatedAt: admin.avatarUpdatedAt,
  }
}

/** Update the editable display name. */
export async function updateAdminDisplayName(adminId: string, displayName: string): Promise<AdminProfile> {
  const trimmed = displayName.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Display name cannot be empty.' })
  }

  await db.update(users).set({ displayName: trimmed }).where(eq(users.id, adminId))
  return getAdminProfile(adminId)
}

/** Persist a newly uploaded avatar image directly in the users table. */
export async function updateAvatar(adminId: string, data: Buffer, mimeType: string): Promise<AdminProfile> {
  await db
    .update(users)
    .set({
      avatar: null,
      avatarData: data,
      avatarMimeType: mimeType,
      avatarUpdatedAt: new Date(),
    })
    .where(eq(users.id, adminId))

  return getAdminProfile(adminId)
}

/**
 * Change the password. Requires the current password to be verified first,
 * and records the change time for the "last password change" display.
 */
export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const admin = await findAdminOrThrow(adminId)

  // `passwordHash` is null while an OAuth account has not chosen a password yet,
  // so there is nothing to re-authenticate against and the request must fail.
  if (!admin.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const valid = await verifyPasswordHash(currentPassword, admin.passwordHash)
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
  await db.update(users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(users.id, adminId))
}

/**
 * Change the email (login credential). Requires the current password and
 * enforces uniqueness. In a full product this would trigger a verification
 * email; here it updates directly after re-authentication.
 */
export async function changeAdminEmail(
  adminId: string,
  newEmail: string,
  currentPassword: string,
): Promise<AdminProfile> {
  const admin = await findAdminOrThrow(adminId)

  // Same rule as changeAdminPassword: no stored password means no re-authentication.
  if (!admin.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const valid = await verifyPasswordHash(currentPassword, admin.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
  }

  const email = newEmail.trim().toLowerCase()
  if (!EMAIL_PATTERN.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid email address.' })
  }

  const taken = await db.query.users.findFirst({
    where: and(eq(users.email, email), ne(users.id, adminId)),
  })
  if (taken) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Email is already in use.' })
  }

  await db.update(users).set({ email }).where(eq(users.id, adminId))
  return getAdminProfile(adminId)
}
