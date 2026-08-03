import { API_VERSION } from '~~/server/constants/api'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'

/** OpenAPI contract containing only routes that currently exist. */
export default defineVersionedApiHandler(() => ({
  openapi: '3.1.0',
  info: {
    title: 'GuelmaHistory Admin API',
    version: API_VERSION,
    description: 'Versioned Nitro API used by the GuelmaHistory Flutter admin application.',
  },
  servers: [
    { url: '/api/v1', description: 'Current host' },
  ],
  paths: {
    '/health': {
      get: {
        operationId: 'getApiHealth',
        summary: 'Check versioned API availability',
        responses: {
          200: {
            description: 'API is available',
            headers: {
              'x-request-id': { schema: { type: 'string', format: 'uuid' } },
              'x-api-version': { schema: { type: 'string', const: API_VERSION } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApiDocument',
        summary: 'Get the current API contract',
        responses: {
          200: { description: 'OpenAPI 3.1 document' },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['status', 'apiVersion', 'requestId'],
            properties: {
              status: { type: 'string', const: 'ok' },
              apiVersion: { type: 'string', const: API_VERSION },
              requestId: { type: 'string' },
            },
          },
        },
      },
      FieldError: {
        type: 'object',
        required: ['field', 'message'],
        properties: {
          field: { type: 'string' },
          message: { type: 'string' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'fields', 'requestId'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              fields: {
                oneOf: [
                  { type: 'array', items: { $ref: '#/components/schemas/FieldError' } },
                  { type: 'null' },
                ],
              },
              requestId: { type: 'string' },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        required: ['page', 'pageSize', 'total', 'totalPages', 'hasNextPage', 'hasPreviousPage'],
        properties: {
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100 },
          total: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
          hasNextPage: { type: 'boolean' },
          hasPreviousPage: { type: 'boolean' },
        },
      },
    },
  },
}))
