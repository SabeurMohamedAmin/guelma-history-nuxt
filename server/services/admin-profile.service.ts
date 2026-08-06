import { z } from 'zod'
import { adminProfileRepository } from '~~/server/repositories/admin-profile.repository'
import type { Role } from '~~/shared/auth/roles'
import { createPasswordHash, verifyPasswordHash } from '~~/server/utils/password'
import { mobileAuthSessionRepository } from '~~/server/repositories/mobile-auth-session.repository'

export interface AdminProfileResponse {
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

const displayNameSchema = z.string().trim().min(1, 'Display name cannot be empty.')
const emailSchema = z.string().trim().toLowerCase().email('Invalid email address.')
const passwordSchema = z.string().min(8, 'New password must be at least 8 characters.')

export class AdminProfileService {
  async getProfile(id: string): Promise<AdminProfileResponse> {
    const admin = await this.findAdmin(id)
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

  async getAvatar(id: string): Promise<AdminAvatarImage> {
    const admin = await this.findAdmin(id)
    if (!admin.avatarData || !admin.avatarMimeType) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Avatar not found.' })
    }
    return {
      data: Buffer.from(admin.avatarData),
      mimeType: admin.avatarMimeType,
      updatedAt: admin.avatarUpdatedAt,
    }
  }

  async updateDisplayName(id: string, value: unknown) {
    const displayName = displayNameSchema.parse(value)
    await adminProfileRepository.updateDisplayName(id, displayName)
    return this.getProfile(id)
  }

  async updateAvatar(id: string, data: Buffer, mimeType: string) {
    await adminProfileRepository.updateAvatar(id, data, mimeType)
    return this.getProfile(id)
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const admin = await this.findAdmin(id)
    await this.verifyCurrentPassword(admin.passwordHash, currentPassword)
    const validPassword = passwordSchema.parse(newPassword)
    await adminProfileRepository.updatePassword(id, await createPasswordHash(validPassword))

    // Password changes are a security boundary: revoke every existing mobile
    // session immediately. The mobile access/refresh authentication paths also
    // compare passwordChangedAt with session.createdAt as defense-in-depth.
    // Do not remove either mechanism; explicit revocation and timestamp
    // invalidation intentionally protect against different failure/race cases.
    await mobileAuthSessionRepository.revokeAllForUser(id)
  }

  async changeEmail(id: string, newEmail: string, currentPassword: string) {
    const admin = await this.findAdmin(id)
    await this.verifyCurrentPassword(admin.passwordHash, currentPassword)

    const email = emailSchema.parse(newEmail)
    if (await adminProfileRepository.emailExists(email, id)) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Email is already in use.' })
    }

    await adminProfileRepository.updateEmail(id, email)
    return this.getProfile(id)
  }

  private async findAdmin(id: string) {
    const admin = await adminProfileRepository.findById(id)
    if (!admin) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Admin not found.' })
    }
    return admin
  }

  private async verifyCurrentPassword(hash: string | null, password: string): Promise<void> {
    if (!hash || !await verifyPasswordHash(password, hash)) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Current password is incorrect.' })
    }
  }
}

export const adminProfileService = new AdminProfileService()
