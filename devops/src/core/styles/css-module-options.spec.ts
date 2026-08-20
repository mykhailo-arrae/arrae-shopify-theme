import test from 'ava'
import {
  type CssModulesOptionsOutput,
  makeCssModulesOptions
} from './css-module-options.js'

const macro = test.macro<
  [Parameters<typeof makeCssModulesOptions>[0], CssModulesOptionsOutput]
>({
  exec: (t, input, expected) => {
    const actual = makeCssModulesOptions(input)
    t.deepEqual(actual, expected)
  },
  title: (providedTitle = '', input) => {
    return `given ${JSON.stringify(input)} ${providedTitle}`.trim()
  }
})

test(
  'should set defaults',
  macro,
  { mode: 'custom', assetFilePrefix: null, cssModuleName: null },
  { dashedIdents: true, pattern: 'mod_module_[hash]_[local]' }
)

test(
  'should convert module name to snake case',
  macro,
  { mode: 'custom', assetFilePrefix: 'tvg', cssModuleName: 'core-video' },
  { dashedIdents: true, pattern: 'tvg_core_video_[hash]_[local]' }
)

test(
  macro,
  { mode: 'custom', assetFilePrefix: 'tvg', cssModuleName: null },
  { dashedIdents: true, pattern: 'tvg_module_[hash]_[local]' }
)

test(
  macro,
  { mode: 'custom', assetFilePrefix: 'Tvg', cssModuleName: null },
  { dashedIdents: true, pattern: 'tvg_module_[hash]_[local]' }
)

test(
  'should set rspack defaults',
  macro,
  { mode: 'rspack', assetFilePrefix: 'tvg' },
  { dashedIdents: true, pattern: 'tvg_[folder]_[hash]_[local]' }
)

test(
  macro,
  { mode: 'rspack', assetFilePrefix: null },
  { dashedIdents: true, pattern: 'mod_[folder]_[hash]_[local]' }
)
