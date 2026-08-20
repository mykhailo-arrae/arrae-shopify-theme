import test from 'ava'
import { makeMatchSourceFolder } from './match-source-folder.js'

const check = makeMatchSourceFolder({ srcdir: '_js-dist', workdir: '/app' })

const macro = test.macro<[string | null | undefined, boolean]>({
  exec: async (t, input, expected) => {
    const actual = check({ identifier: () => input })
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${input} ${providedTitle}`.trim()
  }
})

test(macro, '/app/_js-dist/core/cart/schema/item.js', true)

test(macro, '/app/_js-dist/sections/accordion/index.js', true)

test(
  macro,
  '/mnt/tmp/node_modules/.pnpm/file+devops+packages+uberslim-jquery.tgz/node_modules/jquery/dist/jquery.min.js',
  false
)

test(
  macro,
  '/mnt/tmp/node_modules/.pnpm/stent@8.0.4/node_modules/stent/lib/helpers/generators/call.js',
  false
)
