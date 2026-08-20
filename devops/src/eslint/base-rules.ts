import { defineConfig } from 'eslint/config'
import globals from 'globals'

export const baseConfigs = defineConfig([
  {
    name: 'project-global-ignores',
    ignores: [
      '_js-dist',
      '_js-test',
      '_libs/*.js',
      '_misc',
      'assets/*.js',
      'devops/ci',
      'devops/lib',
      'rspack.config.cjs',
      'tmp'
    ]
  },
  {
    name: 'project-base',
    files: ['**/*.{js,mjs,cjs,jsx,mjsx}'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
])
