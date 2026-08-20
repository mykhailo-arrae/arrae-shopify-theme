import test from 'ava'
import { inferCommonDirs, type PathItem } from './common-dirs.js'

const allDirs = async (paths: string[]): Promise<PathItem[]> =>
  paths.map((p) => ({ path: p, type: 'directory' }))

const allFiles = async (paths: string[]): Promise<PathItem[]> =>
  paths.map((p) => ({ path: p, type: 'file' }))

test('returns empty array for empty input', async (t) => {
  const result = await inferCommonDirs({ paths: [], cwd: '/app' })
  t.deepEqual(result, [])
})

test('single directory returns itself', async (t) => {
  const result = await inferCommonDirs({
    paths: ['src/core'],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['src/core'])
})

test('single file returns its parent directory', async (t) => {
  const result = await inferCommonDirs({
    paths: ['src/core/index.ts'],
    cwd: '/app',
    checkFileTypes: allFiles
  })
  t.deepEqual(result, ['src/core'])
})

test('sibling directories are not collapsed (non-greedy)', async (t) => {
  const result = await inferCommonDirs({
    paths: ['app/components', 'app/utils', 'lib/shared'],
    cwd: '/',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['app/components', 'app/utils', 'lib/shared'])
})

test('nested dir is removed when ancestor is present', async (t) => {
  const result = await inferCommonDirs({
    paths: ['_js/core/shopify', '_js/core/shopify/init-section'],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['_js/core/shopify'])
})

test('deduplicates mixed absolute and relative paths', async (t) => {
  const result = await inferCommonDirs({
    paths: [
      '/app/_js/cart/indicator',
      '_js/cart/indicator',
      './_js/cart/indicator'
    ],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['_js/cart/indicator'])
})

test('broad ancestor covers all descendants', async (t) => {
  const result = await inferCommonDirs({
    paths: [
      'devops/src',
      'devops/src/core/errors',
      'devops/src/core/fs',
      'devops/src/gulp/build-sections'
    ],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['devops/src'])
})

test('files in the same directory collapse to one entry', async (t) => {
  const result = await inferCommonDirs({
    paths: [
      'app/components/Header.tsx',
      'app/components/Footer.tsx',
      'app/components/Nav/Item.tsx',
      'app/utils/helpers.ts',
      'app/utils/format.ts',
      'lib/shared/types.ts'
    ],
    cwd: '/repo',
    checkFileTypes: allFiles
  })
  t.deepEqual(result, ['app/components', 'app/utils', 'lib/shared'])
})

test('duplicate paths are deduplicated', async (t) => {
  const result = await inferCommonDirs({
    paths: ['src/core', 'src/core', 'src/utils'],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['src/core', 'src/utils'])
})

test('returns "." when all paths resolve to cwd', async (t) => {
  const result = await inferCommonDirs({
    paths: ['/app/file.ts'],
    cwd: '/app',
    checkFileTypes: allFiles
  })
  t.deepEqual(result, ['.'])
})

test('handles mixed files and directories', async (t) => {
  const mixed = async (paths: string[]): Promise<PathItem[]> =>
    paths.map(
      (p): PathItem => ({
        path: p,
        type: p.includes('.') ? 'file' : 'directory'
      })
    )

  const result = await inferCommonDirs({
    paths: ['src/components', 'src/utils/helper.ts', 'src/utils/format.ts'],
    cwd: '/app',
    checkFileTypes: mixed
  })
  t.deepEqual(result, ['src/components', 'src/utils'])
})

test('deeply nested child is covered by shallow ancestor', async (t) => {
  const result = await inferCommonDirs({
    paths: [
      'devops/src/core/webpack',
      'devops/src/core/webpack/entrypoints',
      'devops/src'
    ],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, ['devops/src'])
})

test('realistic CI input with mixed paths', async (t) => {
  const result = await inferCommonDirs({
    paths: [
      '_js/cart/indicator',
      '/app/_js/cart/indicator',
      '_js/core/cart-v2/operations/change-item-selling-plan',
      '_js/core/dom/visibility-tracker',
      '_js/core/errors',
      '_js/core/function',
      '_js/core/shopify',
      '_js/core/shopify/init-section',
      '_js/core/string',
      '_js/core/typescript',
      '_js/sections/customer-login-main',
      '_js/sections/featured-collections',
      '_js/sections/workbench',
      '_js/snippets/core-video',
      '_js/snippets/product-details',
      '_js/snippets/product-options/app/modules/filter-options',
      '_js/web-components/internal-demo-mute-button',
      'devops/src/asset-loader',
      'devops/src/core/errors',
      'devops/src/core/fs',
      'devops/src/core/logger',
      'devops/src/core/shopify',
      'devops/src/core/string',
      'devops/src/core/time',
      'devops/src/core/webpack/entrypoints',
      'devops/src/core/webpack',
      'devops/src/gulp/build-blocks',
      'devops/src/gulp/build-sections',
      'devops/src/gulp/build-snippets',
      'devops/src/gulp/codegen-workbench-manifest',
      'devops/src/gulp/upload-to-shopify',
      '/app/devops/src',
      'devops/src/styles',
      'devops/src/webpack/chunk-splitting'
    ],
    cwd: '/app',
    checkFileTypes: allDirs
  })
  t.deepEqual(result, [
    '_js/cart/indicator',
    '_js/core/cart-v2/operations/change-item-selling-plan',
    '_js/core/dom/visibility-tracker',
    '_js/core/errors',
    '_js/core/function',
    '_js/core/shopify',
    '_js/core/string',
    '_js/core/typescript',
    '_js/sections/customer-login-main',
    '_js/sections/featured-collections',
    '_js/sections/workbench',
    '_js/snippets/core-video',
    '_js/snippets/product-details',
    '_js/snippets/product-options/app/modules/filter-options',
    '_js/web-components/internal-demo-mute-button',
    'devops/src'
  ])
})
