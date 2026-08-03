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
        responses: { 200: { description: 'OpenAPI 3.1 document' } },
      },
    },
    '/admin/auth/login': {
      post: {
        operationId: 'mobileAdminLogin',
        summary: 'Create a Flutter admin device session',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MobileLoginRequest' } } },
        },
        responses: {
          200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/MobileTokenResponse' } } } },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          429: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/auth/refresh': {
      post: {
        operationId: 'refreshMobileAdminSession',
        summary: 'Rotate a single-use refresh token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MobileRefreshRequest' } } },
        },
        responses: {
          200: { description: 'Token rotated', content: { 'application/json': { schema: { $ref: '#/components/schemas/MobileTokenResponse' } } } },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          429: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/auth/me': {
      get: {
        operationId: 'getMobileAdmin',
        summary: 'Get the authenticated Flutter administrator',
        security: [{ mobileBearer: [] }],
        responses: {
          200: { description: 'Current administrator' },
          401: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/auth/sessions': {
      get: {
        operationId: 'listMobileAdminSessions',
        summary: 'List active Flutter device sessions',
        security: [{ mobileBearer: [] }],
        responses: {
          200: { description: 'Safe device session metadata' },
          401: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/auth/sessions/{id}': {
      delete: {
        operationId: 'revokeMobileAdminSession',
        summary: 'Revoke another owned Flutter device session',
        security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Session revoked' },
          401: { $ref: '#/components/responses/ApiError' },
          404: { $ref: '#/components/responses/ApiError' },
          409: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/auth/logout': {
      post: {
        operationId: 'logoutMobileAdmin',
        summary: 'Revoke the current Flutter device session',
        security: [{ mobileBearer: [] }],
        responses: { 200: { description: 'Logged out' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/auth/logout-all': {
      post: {
        operationId: 'logoutAllMobileAdminSessions',
        summary: 'Revoke every Flutter device session',
        security: [{ mobileBearer: [] }],
        responses: { 200: { description: 'All devices logged out' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
  },
  components: {
    securitySchemes: {
      mobileBearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      ApiError: {
        description: 'Stable API error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
    },
    schemas: {
      MobileLoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['identifier', 'password', 'deviceId', 'platform'],
        properties: {
          identifier: { type: 'string', maxLength: 254 },
          password: { type: 'string', format: 'password', writeOnly: true },
          deviceId: { type: 'string', maxLength: 200 },
          deviceName: { type: 'string', maxLength: 200 },
          platform: { type: 'string', enum: ['android', 'ios'] },
          appVersion: { type: 'string', maxLength: 50 },
        },
      },
      MobileRefreshRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', writeOnly: true, minLength: 32, maxLength: 512 } },
      },
      MobileTokenResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['tokenType', 'accessToken', 'accessTokenExpiresAt', 'refreshToken', 'refreshTokenExpiresAt', 'user'],
            properties: {
              tokenType: { type: 'string', const: 'Bearer' },
              accessToken: { type: 'string', writeOnly: true },
              accessTokenExpiresAt: { type: 'string', format: 'date-time' },
              refreshToken: { type: 'string', writeOnly: true },
              refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
              user: { type: 'object' },
            },
          },
        },
      },
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
