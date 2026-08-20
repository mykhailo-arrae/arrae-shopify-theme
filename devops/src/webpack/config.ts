import Path from 'node:path'
import { defineConfig } from '@rspack/cli'
import {
  BannerPlugin,
  CssExtractRspackPlugin,
  DefinePlugin,
  LightningCssMinimizerRspackPlugin,
  type RspackOptions,
  SwcJsMinimizerRspackPlugin
} from '@rspack/core'
import { browserslist as browserslistQueries } from '../../../package.json' with {
  type: 'json'
}
import { inferEsbuildTargetsFromBrowserslist } from '../core/bundle/browserslist-to-esbuild.js'
import { makeDevOpsConsole } from '../core/logger/console.js'
import { initLogger, shouldBeVerbose } from '../core/logger/index.js'
import { workdir } from '../core/process/workdir.js'
import { ASSET_FILE_PREFIX } from '../core/shopify/asset-file-prefix.js'
import { joinNameSegments } from '../core/string/join-name-segments.js'
import { makeCssModulesOptions } from '../core/styles/css-module-options.js'
import { discoverEntrypoints } from '../core/webpack/entrypoints/index.js'
import { entry as baseEntry } from '../webpack-entries.js'
import { CHUNK_FILE_PREFIX, makeSplitChunks } from './chunk-splitting/index.js'
import { ManifestPlugin } from './manifest-plugin/index.js'
import {
  RAW_OUTPUT_PATH,
  TransientFolderPlugin
} from './transient-folder-plugin/index.js'

const CONFIG_NAME = 'shopify_theme'

const logger = initLogger().with({ name: 'rspack' })

const { pattern: localIdentName } = makeCssModulesOptions({
  mode: 'rspack',
  assetFilePrefix: ASSET_FILE_PREFIX
})

const devOpsConsole = makeDevOpsConsole()

export default defineConfig(async (): Promise<RspackOptions> => {
  logger.debug('Initializing webpack config')

  logger.trace('Inferring esbuild targets from browserslist')
  const esbuildTargets = inferEsbuildTargetsFromBrowserslist()
  logger.trace('Inferred esbuild targets', { targets: esbuildTargets })

  const { count: entryCount, entry } = await discoverEntrypoints({
    baseEntry
  })

  logger.trace('Resolved entries', { entryCount, entry })
  logger.info('{count} entries resolved', { count: entryCount })

  const config = {
    entry,
    experiments: {
      css: true,
      inlineConst: true
    },
    cache: true,
    context: workdir,
    devtool: false,
    externals: {},
    mode: 'none', // no defaults
    name: CONFIG_NAME,
    node: false,
    output: {
      asyncChunks: false,
      compareBeforeEmit: true,
      filename: '[name].js',
      path: RAW_OUTPUT_PATH,
      pathinfo: false,
      uniqueName:
        [ASSET_FILE_PREFIX, CONFIG_NAME]
          .filter((segment) => segment)
          .join('_') || 'a77803764b2c894ecf95cafedf23'
    },
    module: {
      generator: {
        'css/auto': {
          localIdentName,
          exportsConvention: 'as-is'
        }
      },
      parser: {
        'css/auto': {
          namedExports: false
        }
      },
      rules: [
        {
          test: /\.shadow\.scss$/,
          type: 'javascript/auto',
          use: [
            {
              loader: Path.resolve(
                workdir,
                'devops/lib/webpack/shadow-style-loader/index.js'
              )
            }
          ]
        },
        {
          test: /\.module\.scss$/,
          type: 'javascript/auto',
          use: [
            {
              loader: CssExtractRspackPlugin.loader
            },
            {
              loader: Path.resolve(
                workdir,
                'devops/lib/webpack/scss-module-loader/index.js'
              )
            }
          ]
        }
      ]
    },
    optimization: {
      emitOnErrors: false,
      innerGraph: true,
      mergeDuplicateChunks: true,
      minimize: true,
      minimizer: [
        new CssExtractRspackPlugin({
          filename: '[name].css',
          chunkFilename: '[name].css',
          runtime: false
        }),
        new SwcJsMinimizerRspackPlugin({
          minimizerOptions: {
            compress: {
              defaults: true,
              dead_code: true,
              keep_classnames: true,
              keep_fnames: true,
              passes: 3
            },
            mangle: false,
            format: {
              max_line_len: 240,
              comments: 'some'
            }
          }
        }),
        new LightningCssMinimizerRspackPlugin({
          minimizerOptions: {
            errorRecovery: false,
            targets: browserslistQueries
          }
        })
      ],
      chunkIds: 'deterministic',
      moduleIds: 'deterministic',
      nodeEnv: 'production',
      usedExports: true,
      concatenateModules: true,
      providedExports: true,
      realContentHash: true,
      removeAvailableModules: false,
      runtimeChunk: {
        name: joinNameSegments([CHUNK_FILE_PREFIX, 'runtime'])
      },
      sideEffects: true,
      splitChunks: makeSplitChunks({ entryCount })
    },
    infrastructureLogging: {
      console: devOpsConsole,
      level: 'info'
    },
    performance: {
      hints: 'warning',
      maxAssetSize: 3500 * 1024,
      maxEntrypointSize: 5000 * 1024
    },
    plugins: [
      new DefinePlugin({
        'typeof window': JSON.stringify('object'),
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new BannerPlugin({
        banner:
          '/*! DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets] */',
        entryOnly: false,
        raw: true
      }),
      TransientFolderPlugin,
      ManifestPlugin
    ],
    stats: shouldBeVerbose() ? 'normal' : 'minimal',
    target: 'browserslist',
    resolve: {
      alias: {},
      fallback: {
        fs: false
      }
    }
  } satisfies RspackOptions

  return config
})
