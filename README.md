# Guelma History (تاريخ قالمة)

A bilingual (Arabic / French) web app dedicated to the history of Guelma, built with Nuxt and Vuetify.

## Tech stack

- **Framework:** Nuxt 4
- **UI:** Vuetify (via `vite-plugin-vuetify`)
- **State:** Pinia
- **i18n:** `@nuxtjs/i18n` — default locale `ar` (RTL), with `fr` (LTR)
- **Auth:** `nuxt-auth-utils`
- **Security:** `nuxt-security` (rate limiting on auth routes)
- **Images:** `@nuxt/image` with IPX remote providers
- **Email:** Resend (contact form)

## Setup

Install dependencies (project uses pnpm):

```bash
pnpm install
```

Copy the example environment file and fill in the required secrets:

```bash
cp .env.example .env
```

## Development server

Start the dev server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build and preview the production bundle:

```bash
pnpm build
pnpm preview
```

## UI/UX motion

The app uses Nuxt page and layout transitions (`app.pageTransition` / `app.layoutTransition` in `nuxt.config.ts`), backed by CSS in `app/assets/css/main.css`.

All motion respects the user's `prefers-reduced-motion` setting (WCAG 2.3.3): page/layout transitions, smooth scrolling, and the app loader animation (`app/components/layout/LayoutAppLoader.vue`) are disabled for users who opt out.

## Internationalization

Locale files live in `i18n/locales`. The default locale is Arabic (`ar`, RTL); French (`fr`, LTR) is available under the `/fr` prefix. Locale detection is cookie-based.

## Learn more

- [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction)
- [Deployment documentation](https://nuxt.com/docs/getting-started/deployment)
