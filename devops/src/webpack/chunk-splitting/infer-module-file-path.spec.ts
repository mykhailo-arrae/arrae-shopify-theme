import test from 'ava'
import { inferRspackModuleFilePath } from './infer-module-file-path.js'

const macro = test.macro<[string | null | undefined, string | null]>({
  exec: (t, input, expected) => {
    const actual = inferRspackModuleFilePath(input)
    t.is(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(macro, null, null)
test(macro, undefined, null)

test(
  macro,
  '/app/_js-dist/theme/offcanvas-drawers/index.js',
  '/app/_js-dist/theme/offcanvas-drawers/index.js'
)

test(
  macro,
  'javascript/esm|/mnt/tmp/node_modules/.pnpm/remeda@2.19.1/node_modules/remeda/dist/chunk-RAAYCPUM.js',
  '/mnt/tmp/node_modules/.pnpm/remeda@2.19.1/node_modules/remeda/dist/chunk-RAAYCPUM.js'
)

test(
  macro,
  'css|/mnt/tmp/node_modules/.pnpm/css-loader@7.1.2_@rspack+core@1.5.8_@swc+helpers@0.5.17__webpack@5.89.0_@swc+core@1.11._ace24ca1da89e891ec607c83f6049483/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[1].use[1]!/mnt/tmp/node_modules/.pnpm/sass-loader@16.0.4_@rspack+core@1.5.8_@swc+helpers@0.5.17__sass-embedded@1.83.4_webpack_fcaa5a18b5861a13e27a41c27236506e/node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[1].use[2]!/app/_js-dist/core/project/components/product-tile/style.module.scss|0|||}',
  '/app/_js-dist/core/project/components/product-tile/style.module.scss'
)

test(
  macro,
  '/mnt/tmp/node_modules/.pnpm/@rspack+core@1.5.8_@swc+helpers@0.5.17/node_modules/@rspack/core/dist/cssExtractLoader.js!/mnt/tmp/node_modules/.pnpm/css-loader@7.1.2_@rspack+core@1.5.8_@swc+helpers@0.5.17__webpack@5.89.0_@swc+core@1.11._ace24ca1da89e891ec607c83f6049483/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[1].use[1]!/mnt/tmp/node_modules/.pnpm/sass-loader@16.0.4_@rspack+core@1.5.8_@swc+helpers@0.5.17__sass-embedded@1.83.4_webpack_fcaa5a18b5861a13e27a41c27236506e/node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[1].use[2]!/app/_js-dist/core/project/components/image/style.module.scss',
  '/app/_js-dist/core/project/components/image/style.module.scss'
)

test(
  macro,
  'css|/mnt/tmp/node_modules/.pnpm/css-loader@7.1.2_@rspack+core@1.5.8_@swc+helpers@0.5.17__webpack@5.89.0_@swc+core@1.11._ace24ca1da89e891ec607c83f6049483/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[1].use[1]!/mnt/tmp/node_modules/.pnpm/sass-loader@16.0.4_@rspack+core@1.5.8_@swc+helpers@0.5.17__sass-embedded@1.83.4_webpack_fcaa5a18b5861a13e27a41c27236506e/node_modules/sass-loader/dist/cjs.js??ruleSet[1].rules[1].use[2]!/app/_js-dist/core/project/components/add-to-cart/style.module.scss|0|||}',
  '/app/_js-dist/core/project/components/add-to-cart/style.module.scss'
)

test(
  macro,
  '/app/devops/lib/webpack/shadow-style-loader/index.js!/app/_js-dist/web-components/internal-demo-mute-button/style.shadow.scss',
  '/app/_js-dist/web-components/internal-demo-mute-button/style.shadow.scss'
)
