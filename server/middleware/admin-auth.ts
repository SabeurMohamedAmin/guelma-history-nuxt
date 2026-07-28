import { requireAdmin } from '~~/server/utils/auth'

/**
 * Server gatekeeper for every `/api/admin/*` route.
 *
 * Centralizing the check here means individual admin CRUD handlers don't each
 * have to re-implement auth — they can assume the request is authorized.
 */
export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/admin')) return

  await requireAdmin(event)
})
