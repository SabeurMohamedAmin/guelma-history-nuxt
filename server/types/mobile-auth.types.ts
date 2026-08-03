export interface MobileAuthConfig {
  signingKey: string
  issuer: string
  audience: string
  accessTokenTtlSeconds: number
  refreshTokenTtlDays: number
  maxActiveDevices: number
}

export interface MobileAccessTokenClaims {
  sub: string
  sid: string
  typ: 'access'
  role: 'admin'
  iss: string
  aud: string
  iat: number
  exp: number
  jti: string
}

export interface MobileRefreshToken {
  rawToken: string
  tokenHash: string
  expiresAt: Date
}
