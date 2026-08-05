/**
 * Boot-time check that every server-only secret is really configured.
 *
 * An empty HMAC key still produces valid-looking signatures, so a missing
 * mobile signing key would silently let anyone forge admin access tokens
 * instead of failing visibly. Production therefore refuses to start;
 * development only warns so a fresh clone stays runnable.
 *
 * Secret VALUES are never read into log output — only their variable names.
 * The `00-` prefix runs this before the other plugins, so a misconfigured
 * server dies before it accepts a single request.
 */

type RequiredSecret = {
  /** Environment variable a developer has to set. */
  envName: string
  value: string
  minLength: number
}

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const isProduction = process.env.NODE_ENV === 'production'

  const secrets: RequiredSecret[] = [
    { envName: 'NUXT_SESSION_PASSWORD', value: config.session.password, minLength: 32 },
    { envName: 'NUXT_MOBILE_AUTH_SIGNING_KEY', value: config.mobileAuth.signingKey, minLength: 32 },
    { envName: 'NUXT_CLOUDINARY_API_SECRET', value: config.cloudinaryApiSecret, minLength: 8 },
  ]

  const problems = secrets
    .filter(secret => secret.value.trim().length < secret.minLength)
    .map(secret => `${secret.envName} (needs at least ${secret.minLength} characters)`)

  // A rotation mistake that would keep accepting tokens signed by a retired key.
  const { signingKey, previousSigningKey } = config.mobileAuth
  if (previousSigningKey && previousSigningKey === signingKey) {
    problems.push('NUXT_MOBILE_AUTH_PREVIOUS_SIGNING_KEY must differ from the current signing key')
  }

  if (problems.length === 0) return

  const report = `Server secrets are not configured: ${problems.join(', ')}`

  if (isProduction) {
    throw new Error(`[security] ${report}`)
  }

  console.warn(`[security] ${report}. Production would refuse to start.`)
})
