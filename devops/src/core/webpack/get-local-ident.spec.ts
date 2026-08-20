import test from 'ava'
import { makeGetLocalIdent } from './get-local-ident.js'

const macro = test.macro<
  [
    {
      assetFilePrefix: string | null
      rootContext: string
      resourcePath: string
      localName: string
    },
    string
  ]
>({
  exec: async (
    t,
    { assetFilePrefix, rootContext, resourcePath, localName },
    expected
  ) => {
    const actual = makeGetLocalIdent({ assetFilePrefix })(
      {
        rootContext,
        resourcePath,
        utils: {
          createHash: () => {
            return {
              update: (data: Buffer) => {
                return data
              },
              digest: () => {
                return 'xyz'
              }
            }
          }
        }
      },
      null,
      localName
    )
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  'should handle empty breadcrumbs',
  macro,
  {
    assetFilePrefix: 'tvg',
    rootContext: '/',
    resourcePath: '/index.js',
    localName: 'myButton'
  },
  'tvg_modules_xyz_myButton'
)

test(
  'should exclude js_dist folder from breadcrumbs',
  macro,
  {
    assetFilePrefix: 'tvg',
    rootContext: '/app',
    resourcePath: '/app/_js-dist/sections/hero-v2/style.module.scss',
    localName: 'Heading'
  },
  'tvg_sections_hero_v_2_xyz_Heading'
)

test(
  'should exclude src folder from breadcrumbs',
  macro,
  {
    assetFilePrefix: 'tvg',
    rootContext: '/app',
    resourcePath: '/app/src/sections/hero-v2/style.module.scss',
    localName: 'Heading'
  },
  'tvg_sections_hero_v_2_xyz_Heading'
)

test(
  'should exclude _js folder from breadcrumbs',
  macro,
  {
    assetFilePrefix: 'tvg',
    rootContext: '/app',
    resourcePath: '/app/_js/sections/hero-v2/style.module.scss',
    localName: 'Heading'
  },
  'tvg_sections_hero_v_2_xyz_Heading'
)

test(
  'should set default asset file prefix if not provided',
  macro,
  {
    assetFilePrefix: null,
    rootContext: '/app',
    resourcePath: '/app/_js-dist/sections/hero-v2/style.module.scss',
    localName: 'Heading'
  },
  'mod_sections_hero_v_2_xyz_Heading'
)

test(
  'should handle empty asset file prefix',
  macro,
  {
    assetFilePrefix: '',
    rootContext: '/app',
    resourcePath: '/app/_js-dist/sections/hero-v2/style.module.scss',
    localName: 'Heading'
  },
  'mod_sections_hero_v_2_xyz_Heading'
)

test(
  'should handle empty local name',
  macro,
  {
    assetFilePrefix: 'tvg',
    rootContext: '/app',
    resourcePath: '/app/_js-dist/sections/hero-v2/style.module.scss',
    localName: ''
  },
  'tvg_sections_hero_v_2_xyz_unknown_selector'
)
