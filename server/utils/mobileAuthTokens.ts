import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type {
  MobileAccessTokenClaims,
  MobileAuthConfig,
  MobileRefreshToken,
} from '~~/server/types/mobile-auth.types'

const MINIMUM_SIGNING_KEY_LENGTH = 32

export function getMobileAuthConfig(): MobileAuthConfig {
  const config = useRuntimeConfig().mobileAuth
  const signingKey = String(config.signingKey || '')

  if (signingKey.length < MINIMUM_SIGNING_KEY_LENGTH) {
    throw new Error('NUXT_MOBILE_AUTH_SIGNING_KEY must contain at least 32 characters.')
  }

  return {
    signingKey,
    issuer: String(config.issuer),
    audience: String(config.audience),
    accessTokenTtlSeconds: positiveInteger(config.accessTokenTtlSeconds, 900),
    refreshTokenTtlDays: positiveInteger(config.refreshTokenTtlDays, 30),
    maxActiveDevices: positiveInteger(config.maxActiveDevices, 5),
  }
}

export function createMobileAccessToken(
  userId: string,
  sessionId: string,
  config: MobileAuthConfig = getMobileAuthConfig(),
): { token: string, expiresAt: Date } {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAtSeconds = issuedAt + config.accessTokenTtlSeconds
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const claims: MobileAccessTokenClaims = {
    sub: userId,
    sid: sessionId,
    typ: 'access',
    role: 'admin',
    iss: config.issuer,
    aud: config.audience,
    iat: issuedAt,
    exp: expiresAtSeconds,
    jti: crypto.randomUUID(),
  }
  const payload = encodeJson(claims)
  const signature = sign(`${header}.${payload}`, config.signingKey)

  return {
    token: `${header}.${payload}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000),
  }
}

export function verifyMobileAccessToken(
  token: string,
  config: MobileAuthConfig = getMobileAuthConfig(),
): MobileAccessTokenClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  if (!header || !payload || !signature) return null

  const expectedSignature = sign(`${header}.${payload}`, config.signingKey)
  if (!safeEqual(signature, expectedSignature)) return null

  try {
    const parsedHeader = decodeJson<{ alg?: string, typ?: string }>(header)
    const claims = decodeJson<MobileAccessTokenClaims>(payload)
    const now = Math.floor(Date.now() / 1000)

    if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') return null
    if (claims.typ !== 'access' || claims.role !== 'admin') return null
    if (claims.iss !== config.issuer || claims.aud !== config.audience) return null
    if (!claims.sub || !claims.sid || !claims.jti) return null
    if (!Number.isInteger(claims.iat) || !Number.isInteger(claims.exp)) return null
    if (claims.iat > now + 30 || claims.exp <= now) return null

    return claims
  }
  catch {
    return null
  }
}

export function createMobileRefreshToken(
  config: MobileAuthConfig = getMobileAuthConfig(),
): MobileRefreshToken {
  const rawToken = randomBytes(32).toString('base64url')
  const expiresAt = new Date()
  expiresAt.setUTCDate(expiresAt.getUTCDate() + config.refreshTokenTtlDays)

  return {
    rawToken,
    tokenHash: hashMobileRefreshToken(rawToken),
    expiresAt,
  }
}

export function hashMobileRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

function sign(value: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(value).digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function decodeJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
}

function positiveInteger(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : fallback
}
