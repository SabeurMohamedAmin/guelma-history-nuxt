import { asc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'

/**
 * GET /api/admin/subscribers/export
 *
 * Streams active subscribers as a CSV file, ready to import into a mailing
 * tool. Only active addresses are exported so the list follows the double
 * opt-in subscription flow and excludes pending/unsubscribed rows.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db
    .select({
      email: subscribers.email,
      confirmedAt: subscribers.confirmedAt,
      createdAt: subscribers.createdAt,
    })
    .from(subscribers)
    .where(eq(subscribers.status, 'active'))
    .orderBy(asc(subscribers.email))

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`

  const header = 'email,confirmed_at,created_at'
  const body = rows
    .map(r => [
      escape(r.email),
      escape(r.confirmedAt ? r.confirmedAt.toISOString() : ''),
      escape(r.createdAt ? r.createdAt.toISOString() : ''),
    ].join(','))
    .join('\n')

  const csv = `${header}\n${body}\n`
  const date = new Date().toISOString().slice(0, 10)

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="subscribers-${date}.csv"`)

  return csv
})
