import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'

/** Non-sensitive contract probe for Flutter development. */
export default defineVersionedApiHandler((_event, { requestId }) => {
  return success({
    status: 'ok' as const,
    apiVersion: 'v1' as const,
    requestId,
  })
})
