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
    '/admin/articles': {
      post: {
        operationId: 'createMobileAdminArticle',
        summary: 'Create a bilingual article',
        security: [{ mobileBearer: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          201: { description: 'Article created' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          409: { $ref: '#/components/responses/ApiError' },
        },
      },
      get: {
        operationId: 'listMobileAdminArticles',
        summary: 'List and search bilingual articles',
        security: [{ mobileBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['published', 'draft', 'all'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['createdAt', 'updatedAt', 'publishedAt', 'title'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          200: { description: 'Paginated articles' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/articles/{id}': {
      patch: {
        operationId: 'updateMobileAdminArticle',
        summary: 'Update an article by stable UUID',
        security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Article updated' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          404: { $ref: '#/components/responses/ApiError' },
        },
      },
      delete: {
        operationId: 'deleteMobileAdminArticle',
        summary: 'Delete an article by stable UUID',
        security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Article deleted' },
          401: { $ref: '#/components/responses/ApiError' },
          404: { $ref: '#/components/responses/ApiError' },
        },
      },
      get: {
        operationId: 'getMobileAdminArticle',
        summary: 'Get an article by stable UUID',
        security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Serialized article' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          404: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/articles/{id}/autosave': {
      patch: {
        operationId: 'autosaveMobileAdminArticle',
        summary: 'Retry-safe autosave for an unpublished bilingual draft',
        description: 'Accepts draft text only and cannot publish or change structural fields.',
        security: [{ mobileBearer: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 16, maxLength: 100, pattern: '^[A-Za-z0-9._-]+$' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ArticleAutosaveRequest' } } } },
        responses: {
          200: { description: 'Draft saved or completed retry replayed' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
          404: { $ref: '#/components/responses/ApiError' },
          409: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/categories': {
      get: {
        operationId: 'listMobileAdminCategories', summary: 'List and search categories', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Categories' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
      post: {
        operationId: 'createMobileAdminCategory', summary: 'Create a category', security: [{ mobileBearer: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 201: { description: 'Category created' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/categories/{id}': {
      patch: {
        operationId: 'updateMobileAdminCategory', summary: 'Update a category', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Category updated' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
      delete: {
        operationId: 'deleteMobileAdminCategory', summary: 'Safely delete a category', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Category deleted' }, 401: { $ref: '#/components/responses/ApiError' }, 409: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/authors': {
      get: {
        operationId: 'listMobileAdminAuthors', summary: 'List and search authors', security: [{ mobileBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated authors' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
      post: {
        operationId: 'createMobileAdminAuthor', summary: 'Create an author', security: [{ mobileBearer: [] }],
        responses: { 201: { description: 'Author created' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/authors/options': {
      get: {
        operationId: 'listMobileAdminAuthorOptions', summary: 'Get lightweight author options', security: [{ mobileBearer: [] }],
        responses: { 200: { description: 'Author options' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/authors/{id}': {
      patch: {
        operationId: 'updateMobileAdminAuthor', summary: 'Update an author', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Author updated' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
      delete: {
        operationId: 'deleteMobileAdminAuthor', summary: 'Safely delete an author', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Author deleted' }, 401: { $ref: '#/components/responses/ApiError' }, 409: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/comments/reports': {
      get: {
        operationId: 'listMobileAdminCommentReports',
        summary: 'List unresolved reported-comment groups',
        security: [{ mobileBearer: [] }],
        responses: {
          200: { description: 'Unresolved report groups' },
          401: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/comments/reports/{commentId}/resolve': {
      post: {
        operationId: 'resolveMobileAdminCommentReports',
        summary: 'Resolve all open reports for a comment',
        security: [{ mobileBearer: [] }],
        parameters: [{ name: 'commentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Reports resolved' },
          400: { $ref: '#/components/responses/ApiError' },
          401: { $ref: '#/components/responses/ApiError' },
        },
      },
    },
    '/admin/subscribers': {
      get: {
        operationId: 'listMobileAdminSubscribers', summary: 'List, search, and filter subscribers', security: [{ mobileBearer: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'active', 'pending', 'unsubscribed'] } },
        ],
        responses: { 200: { description: 'Paginated subscribers' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/subscribers/{id}/subscription': {
      patch: {
        operationId: 'updateMobileAdminSubscriberStatus', summary: 'Update subscription status', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Status updated' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/subscribers/{id}': {
      delete: {
        operationId: 'deleteMobileAdminSubscriber', summary: 'Delete a subscriber', security: [{ mobileBearer: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Subscriber deleted' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/subscribers/export': {
      get: {
        operationId: 'exportMobileAdminSubscribers', summary: 'Export active subscribers as CSV', security: [{ mobileBearer: [] }],
        responses: { 200: { description: 'CSV export', content: { 'text/csv': { schema: { type: 'string' } } } }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/profile': {
      get: {
        operationId: 'getMobileAdminProfile', summary: 'Get the admin profile', security: [{ mobileBearer: [] }],
        responses: { 200: { description: 'Profile' }, 401: { $ref: '#/components/responses/ApiError' } },
      },
    },
    '/admin/profile/display-name': {
      patch: { operationId: 'updateMobileAdminDisplayName', summary: 'Update display name', security: [{ mobileBearer: [] }], responses: { 200: { description: 'Profile updated' }, 401: { $ref: '#/components/responses/ApiError' } } },
    },
    '/admin/profile/email': {
      patch: { operationId: 'updateMobileAdminEmail', summary: 'Update email after password verification', security: [{ mobileBearer: [] }], responses: { 200: { description: 'Email updated' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } } },
    },
    '/admin/profile/password': {
      patch: { operationId: 'updateMobileAdminPassword', summary: 'Change password and revoke all mobile sessions', security: [{ mobileBearer: [] }], responses: { 200: { description: 'Password updated; login required' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } } },
    },
    '/admin/profile/avatar': {
      get: { operationId: 'getMobileAdminAvatar', summary: 'Get private avatar bytes', security: [{ mobileBearer: [] }], responses: { 200: { description: 'WebP avatar' }, 401: { $ref: '#/components/responses/ApiError' }, 404: { $ref: '#/components/responses/ApiError' } } },
      post: { operationId: 'uploadMobileAdminAvatar', summary: 'Normalize and save an avatar', security: [{ mobileBearer: [] }], responses: { 200: { description: 'Profile updated' }, 400: { $ref: '#/components/responses/ApiError' }, 401: { $ref: '#/components/responses/ApiError' } } },
    },
    '/admin/dashboard': {
      get: {
        operationId: 'getMobileAdminDashboard',
        summary: 'Get real admin counts and recent articles',
        security: [{ mobileBearer: [] }],
        responses: {
          200: { description: 'Dashboard data' },
          401: { $ref: '#/components/responses/ApiError' },
        },
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
      ArticleAutosaveRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['expectedRevision'],
        properties: {
          expectedRevision: { type: 'integer', minimum: 1 },
          titleAr: { type: 'string', minLength: 1, maxLength: 255 },
          titleFr: { type: 'string', minLength: 1, maxLength: 255 },
          excerptAr: { type: ['string', 'null'], maxLength: 500 },
          excerptFr: { type: ['string', 'null'], maxLength: 500 },
          bodyAr: { type: 'string', minLength: 1 },
          bodyFr: { type: 'string', minLength: 1 },
        },
        anyOf: [
          { required: ['titleAr'] }, { required: ['titleFr'] },
          { required: ['excerptAr'] }, { required: ['excerptFr'] },
          { required: ['bodyAr'] }, { required: ['bodyFr'] },
        ],
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
