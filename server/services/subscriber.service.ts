import { subscriberRepository } from '~~/server/repositories/subscriber.repository'
import { cleanupExpiredPendingSubscriptions } from '~~/server/utils/newsletter'
import { adminSubscriberStatusSchema } from '~~/server/validators/newsletter.validator'

export class SubscriberService {
  findAll() { return subscriberRepository.findAll() }
  count() { return subscriberRepository.count() }

  async exportActiveCsv(): Promise<string> {
    const rows = await subscriberRepository.findActiveForExport()
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const header = 'email,confirmed_at,created_at'
    const body = rows.map(row => [
      escape(row.email),
      escape(row.confirmedAt?.toISOString() ?? ''),
      escape(row.createdAt.toISOString()),
    ].join(',')).join('\n')

    return `${header}\n${body}\n`
  }

  async updateStatus(id: string, input: unknown): Promise<void> {
    const { status } = adminSubscriberStatusSchema.parse(input)
    if (!await subscriberRepository.updateStatus(id, status)) {
      throw createError({ statusCode: 404, message: 'Subscriber not found' })
    }
  }

  async delete(id: string): Promise<void> {
    if (!await subscriberRepository.delete(id)) {
      throw createError({ statusCode: 404, message: 'Subscriber not found' })
    }
  }

  cleanupExpiredPending() {
    return cleanupExpiredPendingSubscriptions()
  }
}

export const subscriberService = new SubscriberService()
