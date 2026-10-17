# API authorization matrix

This matrix describes the central policy in `server/utils/apiRouteTiers.ts` and
`server/middleware/privileged-api-auth.ts`. It is a route-tier baseline, not a
substitute for handler-level validation, ownership checks, or service policy.

## Enforcement rules

| Tier | Route family | Required authorization | Notes |
|---|---|---|---|
| Public | `GET /api/home`, `/api/search`, article, author, category, public comment, and `/api/uploads/:filename` reads | None | Handlers must still validate query parameters and avoid exposing drafts or private fields. |
| Public write | `POST /api/articles/comments`, correction requests, contact, newsletter | None at the session layer | Input validation, abuse controls, verification and route-specific rate limits remain mandatory. |
| Authentication entry | `/api/auth/login`, author/user login, register, verify, forgot/reset password, logout, Facebook OAuth callbacks | None at the session layer | Sensitive endpoints are rate-limited by `nuxt-security`; OAuth callback state is managed by `nuxt-auth-utils`. |
| Session | `/api/auth/user/avatar`, complete-profile, `/api/auth/user/profile/**`, bookmarks, authenticated comments, notifications | Signed-in user | Individual handlers may require a completed profile or stricter ownership policy. |
| Author | `/api/author/**` | Cookie session with author-or-higher role | Article writes must additionally use `requireArticleOwner`; admin may act across owners. |
| Admin | `/api/admin/**` | Cookie session with admin role | Handler-level guards remain in place as defense in depth. |
| Mobile public auth | `POST /api/v1/admin/auth/login` and `/refresh` | No access bearer token | Credentials/refresh token validated by `mobileAuthService`; refresh tokens rotate and are single-use. |
| Mobile admin | All other `/api/v1/admin/**` routes | Valid bearer access token plus active DB session and current admin account | Password changes, role demotion, verification changes and revocation must take effect immediately. |
| Framework | `ANY /api/_auth/session`, `GET /api/_nuxt_icon/**` | Framework-specific | Keep these explicit; do not add broad framework wildcards. |

## Deny-by-default behavior

- Every file under `server/api/**` is discovered by
  `test/unit/api-route-coverage.spec.ts`; a new route must receive an explicit
  tier decision before tests pass.
- In production, route-tier enforcement is unconditional. The
  `NUXT_ENFORCE_API_ROUTE_TIERS` flag only opts development/test environments
  into enforcement; it cannot turn production back to audit-only mode.
- Cookie-admin and cookie-author prefixes, and all protected mobile-admin
  routes, are always enforced before the route handler runs.
- A route not classified as public/session/privileged is rejected with 401.
- Keep handler guards and ownership checks even when the central middleware
  covers the route; they protect service calls from future alternate entry points.

## Regression coverage

Run `pnpm test:security` for route coverage, matching and production-enforcement
tests, author ownership tests, mobile token guard/lifecycle tests, remote-avatar
SSRF/redirect tests, and media signature validation.
Database-backed concurrency tests live in `test/integration/` and require a
disposable database configured only through `NUXT_TEST_DATABASE_URL`; never use
the application database for those tests.
