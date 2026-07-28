import { Resend } from 'resend'

const DEFAULT_RESEND_FROM_EMAIL = 'Guelma History <onboarding@resend.dev>'

/**
 * True when a Resend API key is configured. We read it from the environment
 * to decide whether to actually send or fall back to logging in development.
 */
export function isEmailEnabled(): boolean {
  return Boolean(process.env.NUXT_RESEND_API_KEY)
}

let resendClient: Resend | null = null

/**
 * Returns a Resend client backed by the official `resend` SDK.
 *
 * Replaces the removed `nuxt-resend` module's `useResend()` so existing callers
 * keep working: `const { emails } = useResend()`. The client is created once and
 * reused. Throws if no API key is set (callers guard with `isEmailEnabled()`).
 */
export function useResend(): Resend {
  const apiKey = process.env.NUXT_RESEND_API_KEY

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY is required to send emails.',
    })
  }

  resendClient ??= new Resend(apiKey)
  return resendClient
}
const EMAIL_IN_ANGLE_BRACKETS_RE = /<([^<>\s]+@[^<>\s]+\.[^<>\s]+)>/
const PLAIN_EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/**
 * Returns a valid Resend sender address.
 *
 * Nuxt runtime config can be overridden by NUXT_RESEND_FROM_EMAIL. If that env
 * value is malformed, Resend receives broken values like `onboarding@`, so fail
 * early with a clear server-side error instead.
 */
export function getResendFromEmail(): string {
  const configuredFrom = String(useRuntimeConfig().resendFromEmail || '').trim()
  const from = configuredFrom || DEFAULT_RESEND_FROM_EMAIL

  if (isValidResendFromEmail(from)) {
    return from
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Email sender not configured correctly',
    message: `NUXT_RESEND_FROM_EMAIL must be a valid email or name/email pair, for example: ${DEFAULT_RESEND_FROM_EMAIL}`,
  })
}

function isValidResendFromEmail(value: string): boolean {
  const bracketEmail = value.match(EMAIL_IN_ANGLE_BRACKETS_RE)?.[1]

  return PLAIN_EMAIL_RE.test(value) || Boolean(bracketEmail && PLAIN_EMAIL_RE.test(bracketEmail))
}
