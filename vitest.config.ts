import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

// Repo root, used to resolve the same path aliases Nuxt provides (~~, ~,
// /server, /shared) inside the plain-node `unit` project, which otherwise has
// no alias config and fails every ~~//server//shared import. `new URL('.', ...)`
// yields a trailing slash, so the leading-slash aliases map to `<root>server`
// and `<root>shared` correctly.
const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '~~': rootDir,
            '~': rootDir,
            '@@': rootDir,
            '@': rootDir,
            '/server': `${rootDir}server`,
            '/shared': `${rootDir}shared`,
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          // @nuxt/test-utils builds the Nuxt test app in a beforeAll hook,
          // which can take well over the default 10s on a cold start. Without
          // this, every nuxt suite fails with "Hook timed out in 10000ms".
          hookTimeout: 120_000,
          environmentOptions: {
            nuxt: {
              rootDir: fileURLToPath(new URL('.', import.meta.url)),
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
    },
  },
})
