# Local database integration tests

These tests verify concurrency and persistence rules that mocks cannot prove.
They are opt-in and do not use pipelines.

## Safe setup

1. Create a disposable CockroachDB/PostgreSQL database.
2. Set `NUXT_TEST_DATABASE_URL` to that database only.
3. Temporarily migrate that isolated database:

   ```bash
   NUXT_DATABASE_URL="$NUXT_TEST_DATABASE_URL" pnpm db:migrate
   ```

4. Run:

   ```bash
   pnpm test:integration
   ```

The tests intentionally never fall back to `NUXT_DATABASE_URL`. They create
uniquely identified fixtures and delete them in foreign-key-safe child-to-parent
order. Cascades are used only where the production schema explicitly defines
them.

## Covered rules

- Concurrent refresh rotation and token-family revocation
- Concurrent upload idempotency claims and response persistence
- Concurrent article-save idempotency claims and response persistence
- Article optimistic revision locking and bilingual draft persistence
- Published-article autosave rejection
- Referenced-media cleanup protection
