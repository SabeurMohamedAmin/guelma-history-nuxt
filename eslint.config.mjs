// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import drizzle from 'eslint-plugin-drizzle'

/**
 * Project ESLint flat config.
 *
 * Formatting is handled by ESLint's stylistic rules (enabled in
 * nuxt.config.ts -> eslint.config.stylistic), so we do NOT use Prettier.
 * House style:
 *  - 2-space indentation
 *  - single quotes
 *  - no semicolons
 *  - trailing commas on multiline
 *
 * The rules below add a few readability conventions on top of the Nuxt preset
 * to keep the code consistent and easy to scan for any developer.
 */
export default withNuxt(
  {
    plugins: {
      drizzle,
    },
    rules: {
      // Safety: never run a Drizzle delete/update without a where clause.
      // drizzleObjectName limits the rules to real Drizzle objects (our `db`
      // instance and `tx` transactions). Without it the plugin flags ANY
      // `.delete()` call, including plain Map/Set methods, as a false
      // positive.
      'drizzle/enforce-delete-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
      'drizzle/enforce-update-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
    },
  },
  {
    rules: {
      // Readability conventions shared across the codebase.
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/html-self-closing': ['error', {
        html: {
          // Components and void elements may self-close; normal HTML tags
          // (div, span, p, ...) must use an explicit closing tag.
          void: 'always',
          normal: 'never',
          component: 'always',
        },
      }],
      // Prefer template literals and const for clearer intent.
      'prefer-template': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      // Keep imports tidy and grouped.
      'import/newline-after-import': 'error',
      // Disallow leftover debugging in committed code.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Server-side maintenance scripts (DB seeds/checks and transactional
    // email senders) legitimately log progress to the terminal, so plain
    // console.log is allowed there.
    files: ['server/db/**', 'server/utils/email/**'],
    rules: {
      'no-console': 'off',
    },
  },
)
