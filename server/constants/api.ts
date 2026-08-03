export const API_VERSION = 'v1' as const

/**
 * Versioning policy for mobile API clients.
 *
 * Additive fields may be introduced within v1. Removing or renaming fields,
 * changing their meaning, or making optional fields required needs a new major
 * API version. Deprecated versions receive explicit response headers before
 * removal.
 */
export const API_COMPATIBILITY_POLICY = {
  version: API_VERSION,
  status: 'current' as const,
  deprecated: false,
  sunsetAt: null,
}
