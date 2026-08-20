import test from 'ava'
import {
  type ModuleCondition,
  makeMatchNodeModuleNames
} from './match-module-names.js'

const macro = test.macro<
  [{ conditions: ModuleCondition[]; path: string }, boolean]
>({
  exec: async (t, { conditions, path }, expected) => {
    const match = makeMatchNodeModuleNames({ tmpdir: '/mnt/tmp' })
    const actual = match(conditions)({ identifier: () => path })
    t.is(actual, expected)
  },
  title: (providedTitle = '', { conditions, path }) => {
    const cs = conditions
      .map(({ name, mode }) => {
        return [mode, name].map((v) => JSON.stringify(v)).join(' ')
      })
      .join(', ')

    return `given ${cs} on ${path} ${providedTitle}`.trim()
  }
})

test(
  macro,
  {
    conditions: [{ name: 'swiper', mode: 'contains' }],
    path: '/app/_js-dist/core/swiper/index.js'
  },
  false
)

test(
  macro,
  {
    conditions: [{ name: 'jquery', mode: 'exact' }],
    path: '/mnt/tmp/node_modules/.pnpm/jquery@file+devops+packages+uberslim-jquery.tgz/node_modules/jquery/dist/jquery.min.js'
  },
  true
)

test(
  macro,
  {
    conditions: [{ name: 'uberslim-jquery', mode: 'contains' }],
    path: '/mnt/tmp/node_modules/.pnpm/file+devops+packages+uberslim-jquery.tgz/node_modules/jquery/dist/jquery.min.js'
  },
  true
)

test(
  macro,
  {
    conditions: [{ name: 'ky', mode: 'exact' }],
    path: '/mnt/tmp/node_modules/.pnpm/ky@0.33.2/node_modules/ky/distribution/core/constants.js'
  },
  true
)

test(
  macro,
  {
    conditions: [{ name: '@github/mini-throttle', mode: 'exact' }],
    path: '/mnt/tmp/node_modules/.pnpm/@github+mini-throttle@2.1.1/node_modules/@github/mini-throttle/dist/index.js'
  },
  true
)

test(
  macro,
  {
    conditions: [{ name: '@github', mode: 'startsWith' }],
    path: '/mnt/tmp/node_modules/.pnpm/@github+mini-throttle@2.1.1/node_modules/@github/mini-throttle/dist/index.js'
  },
  true
)

test(
  'should handle esm prefix',
  macro,
  {
    conditions: [{ name: 'zod', mode: 'exact' }],
    path: 'javascript/esm|/mnt/tmp/node_modules/.pnpm/zod@3.24.2/node_modules/zod/lib/index.mjs'
  },
  true
)

test(
  'should handle esm prefix and loader prefix',
  macro,
  {
    conditions: [{ name: 'zod', mode: 'exact' }],
    path: 'javascript/esm|/app/devops/lib/webpack/custom-loader/index.js!/mnt/tmp/node_modules/.pnpm/zod@3.24.2/node_modules/zod/lib/index.mjs'
  },
  true
)
