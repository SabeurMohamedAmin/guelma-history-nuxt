import { API_VERSION } from '~~/server/constants/api'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'

/** Non-sensitive contract probe for Flutter development. */
export default defineVersionedApiHandler((_event, { requestId }) => {
  return success({
    status: 'ok' as const,
    apiVersion: API_VERSION,
    requestId,
  })
})
