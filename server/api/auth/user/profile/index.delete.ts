import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { requireCompleteUser } from '~~/server/utils/auth'
import { DUMMY_PASSWORD_HASH, verifyPasswordHash } from '~~/server/utils/password'

const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
  confirmation: z.string().trim().min(1),
}).refine(data => data.currentPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
})

/** Permanently delete the signed-in member's account and related data. */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireCompleteUser(event, 'user')

  // This endpoint is intentionally limited to ordinary members. Authors and
  // admins can own editorial content and must use an administrative process.
  if (sessionUser.role !== 'user') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only member accounts can be deleted here.',
    })
  }

  const result = deleteAccountSchema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Password and username confirmation are required.',
    })
  }

  const account = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
    columns: { id: true, username: true, passwordHash: true, role: true },
  })

  if (!account || account.role !== 'user') {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Account not found.' })
  }

  const passwordValid = await verifyPasswordHash(
    result.data.currentPassword,
    account.passwordHash ?? DUMMY_PASSWORD_HASH,
  )

  if (!passwordValid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'The password is incorrect.',
    })
  }

  if (result.data.confirmation !== account.username) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'The username confirmation does not match.',
    })
  }

  const deleted = await db.delete(users)
    .where(eq(users.id, account.id))
    .returning({ id: users.id })

  if (deleted.length !== 1) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Account could not be deleted.' })
  }

  await clearUserSession(event)
  return { message: 'Account deleted.' }
})
