import Path from 'node:path'
import gulp, { type TaskFunction } from 'gulp'
import { watchFiles } from '../core/fs/watcher/run.js'
import { buildAllBlocks } from './build-blocks/index.js'
import { buildAllLocales } from './build-locales/index.js'
import { buildAllSections } from './build-sections/index.js'
import { buildAllSnippets } from './build-snippets/index.js'
import { buildAllStandaloneBundles } from './build-standalone-bundles/index.js'
import {
  buildAllGlobalStyles,
  buildAllInlineGlobalStyles
} from './build-styles/index.js'
import { buildWebComponentSsrStyles } from './build-wc-ssr-styles/index.js'
import { codegenAllCssModuleTypedefs } from './codegen-css-module-typedefs/task.js'
import { codegenStyleGuideColors } from './codegen-style-guide-colors/task.js'
import { codegenWorkbenchManifest } from './codegen-workbench-manifest/task.js'
import { customizeGulpLogs } from './modules/customize-logs.js'

customizeGulpLogs()

const codegen = gulp.series(
  codegenAllCssModuleTypedefs,
  codegenStyleGuideColors,
  codegenWorkbenchManifest
)

const watchStyleGuideColors = watchFiles({
  name: 'watchStyleGuideColors',
  watched: ['_sass/core/style-guide'],
  extensions: ['scss'],
  taskFile: Path.resolve(
    __dirname,
    './codegen-style-guide-colors/on-change.js'
  ),
  onBusyAction: 'do-nothing',
  runOnStart: false
})

const watchWorkbenchManifest = watchFiles({
  name: 'watchWorkbenchManifest',
  watched: ['sections', 'templates'],
  extensions: ['liquid', 'json'],
  taskFile: Path.resolve(
    __dirname,
    './codegen-workbench-manifest/on-change.js'
  ),
  onBusyAction: 'do-nothing',
  runOnStart: true
})

const watchCssModuleTypedefs = watchFiles({
  name: 'watchCssModuleTypedefs',
  watched: ['_js'],
  extensions: ['scss'],
  taskFile: Path.resolve(
    __dirname,
    './codegen-css-module-typedefs/on-change.js'
  ),
  onBusyAction: 'do-nothing',
  runOnStart: false
})

const watchLocales = watchFiles({
  name: 'watchLocales',
  watched: ['locales'],
  extensions: ['json'],
  taskFile: Path.resolve(__dirname, './build-locales/on-change.js'),
  onBusyAction: 'do-nothing',
  runOnStart: true
})

const watchShopify = watchFiles({
  name: 'watchShopify',
  watched: [
    'assets',
    'blocks',
    'config',
    'layout',
    'locales',
    'sections',
    'snippets',
    'templates'
  ],
  taskFile: Path.resolve(__dirname, './upload-to-shopify/on-change.js'),
  debounce: 1000,
  onBusyAction: 'queue'
})

const watchStandaloneBundles = watchFiles({
  name: 'watchStandaloneBundles',
  watched: ['_js/standalone'],
  extensions: ['ts', 'tsx', 'js', 'scss'],
  taskFile: Path.resolve(__dirname, './build-standalone-bundles/on-change.js'),
  onBusyAction: 'queue',
  runOnStart: false
})

const watchBlocks = watchFiles({
  name: 'watchBlocks',
  watched: ['_js/blocks'],
  extensions: ['liquid', 'scss'],
  taskFile: Path.resolve(__dirname, './build-blocks/on-change.js'),
  onBusyAction: 'queue',
  runOnStart: false
})

const watchSections = watchFiles({
  name: 'watchSections',
  watched: ['_js/sections'],
  extensions: ['liquid', 'scss'],
  taskFile: Path.resolve(__dirname, './build-sections/on-change.js'),
  onBusyAction: 'queue',
  runOnStart: false
})

const watchSnippets = watchFiles({
  name: 'watchSnippets',
  watched: ['_js/snippets'],
  extensions: ['liquid', 'scss'],
  taskFile: Path.resolve(__dirname, './build-snippets/on-change.js'),
  onBusyAction: 'queue',
  runOnStart: false
})

const watchStyles = watchFiles({
  name: 'watchStyles',
  watched: ['_sass'],
  extensions: ['scss'],
  taskFile: Path.resolve(__dirname, './build-styles/on-change.js'),
  debounce: 500,
  onBusyAction: 'queue',
  runOnStart: true
})

const watchWebComponentSsrStyles = watchFiles({
  name: 'watchWebComponentSsrStyles',
  watched: ['_js/web-components'],
  extensions: ['scss'],
  taskFile: Path.resolve(__dirname, './build-wc-ssr-styles/on-change.js'),
  debounce: 500,
  onBusyAction: 'queue',
  runOnStart: true
})

const buildAllStyles: TaskFunction = gulp.series(
  buildAllGlobalStyles,
  buildAllInlineGlobalStyles
)

const IndividualBuildTasks = {
  codegen,
  buildAllLocales,
  buildAllStandaloneBundles,
  buildAllBlocks,
  buildAllSections,
  buildAllSnippets,
  buildAllStyles,
  buildWebComponentSsrStyles
} satisfies Record<string, TaskFunction>

const build: TaskFunction = gulp.series(...Object.values(IndividualBuildTasks))

const watchAll: TaskFunction = gulp.series(
  build,
  gulp.parallel(
    watchBlocks,
    watchCssModuleTypedefs,
    watchLocales,
    watchSections,
    watchShopify,
    watchSnippets,
    watchStandaloneBundles,
    watchStyleGuideColors,
    watchStyles,
    watchWebComponentSsrStyles,
    watchWorkbenchManifest
  )
)

export const tasks: { default: TaskFunction; [K: string]: TaskFunction } = {
  ...IndividualBuildTasks,
  build,
  default: watchAll
}
