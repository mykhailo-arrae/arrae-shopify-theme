import fs from 'node:fs/promises'
import Path from 'node:path'
import { from, reduce } from '@reactivex/ix-esnext-cjs/asynciterable/index.js'
import {
  buffer,
  tap
} from '@reactivex/ix-esnext-cjs/asynciterable/operators/index.js'
import * as esbuild from 'esbuild'
import { glob } from 'glob'
import { uniqueBy } from 'remeda'
import { inferEsbuildTargetsFromBrowserslist } from '../../core/bundle/browserslist-to-esbuild.js'
import { StandaloneBundle } from '../../core/bundle/standalone/schema.js'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { inferMaxConcurrency } from '../../core/process/concurrency.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { inferBundleDef } from './infer-bundle-def.js'

const NAME = 'build-standalone-bundles'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildStandaloneBundles: Task = {
  name: NAME,
  exec: async (events = []): Promise<void> => {
    const parentFolder = Path.resolve(workdir, '_js/standalone')

    const esbuildTargets = inferEsbuildTargetsFromBrowserslist()
    const concurrency = inferMaxConcurrency((totalCores) => totalCores - 2)

    logger.trace('Concurrency: {concurrency}', { concurrency })

    try {
      const _bundles: { name: string; path: string }[] = []

      events.forEach(({ type, path }) => {
        if (type === 'remove') {
          return
        }

        const bundle = inferBundleDef({ path, parentFolder, workdir })

        if (bundle == null) {
          return
        }

        _bundles.push(bundle)
      })

      if (_bundles.length === 0) {
        const bundlePaths = await glob('**/*', {
          cwd: parentFolder,
          nodir: true,
          signal: AbortSignal.timeout(10_000)
        })

        bundlePaths.forEach((path) => {
          const bundle = inferBundleDef({
            path: Path.resolve(parentFolder, path),
            parentFolder,
            workdir
          })

          if (bundle == null) {
            return
          }

          _bundles.push(bundle)
        })
      }

      const bundles = uniqueBy(_bundles, (bundle) => {
        return bundle.name
      })

      if (bundles.length === 0) {
        logger.info('No bundles found')
        return
      }

      const bundleNames = bundles
        .map(({ name }) => {
          return name
        })
        .sort()

      if (bundles.length > 5) {
        logger.trace('Compiling {count} bundles', {
          count: bundles.length,
          bundles: bundleNames
        })
      } else {
        logger.trace('Compiling {count} bundles: {bundles}', {
          count: bundles.length,
          bundles: bundleNames.join(', ')
        })
      }

      const steps = reduce<{ name: string; path: string }[], number>(
        from(bundles).pipe(
          buffer(concurrency),
          tap(async (batch) => {
            logger.trace('Building standalone bundles - {bundles}', {
              bundles: batch.map((b) => b.name).join(', ')
            })

            const results = await Promise.allSettled(
              batch.map(async (bundle): Promise<void> => {
                const schemaPath = Path.resolve(
                  parentFolder,
                  bundle.name,
                  'schema.json'
                )

                const [schemaErr, schema] = await safeAwait(
                  StandaloneBundle.parseAsync(
                    JSON.parse(
                      await fs.readFile(schemaPath, { encoding: 'utf-8' })
                    )
                  )
                )

                if (schemaErr != null) {
                  throw new DevOpsError(
                    'Invalid bundle schema: ${schemaPath}',
                    {
                      bundle,
                      err: schemaErr,
                      traceTag: '9fe4aa3d15a54984a75a1806deaa9dc4'
                    }
                  )
                }

                const footer = {
                  js: schema.type === 'snippet' ? '</script>' : ''
                }

                const bannerText = `DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${bundle.path}}]`

                const banner = {
                  js:
                    schema.type === 'snippet'
                      ? `{% # ${bannerText} %}\n<script type="text/javascript">`
                      : `/*! ${bannerText} */`
                }

                const outfile =
                  schema.type === 'snippet'
                    ? Path.resolve(
                        themedir,
                        'snippets',
                        `${bundle.name}.liquid`
                      )
                    : Path.resolve(themedir, 'assets', `${bundle.name}.js`)

                const esbuildResult = await esbuild.build({
                  banner,
                  footer,
                  outfile,
                  bundle: true,
                  define: {
                    'process.env.NODE_ENV': '"production"'
                  },
                  entryPoints: [{ out: bundle.name, in: bundle.path }],
                  format: 'iife',
                  jsx: 'automatic',
                  keepNames: false,
                  lineLimit: 100,
                  minify: false,
                  minifySyntax: true,
                  minifyWhitespace: schema.minify,
                  sourcemap: false,
                  target: esbuildTargets,
                  logLevel: 'error',
                  write: true
                })

                esbuildResult.warnings.forEach(({ text, ...details }) => {
                  logger.warn('{text}', { ...details, text })
                })
              })
            )

            results.forEach((result, resultIndex) => {
              if (result.status === 'rejected') {
                throw new DevOpsError('Some bundles cannot be built', {
                  batch,
                  bundle: batch.at(resultIndex),
                  err: result.reason,
                  traceTag: 'b0ba9a4aa1de43b4ba104a4874f22c0f'
                })
              }
            })
          })
        ),
        {
          callback: (acc, paths) => {
            return acc + paths.length
          },
          seed: 0
        }
      )

      const totalProcessed = await steps

      logger.info('{count} bundles compiled', { count: totalProcessed })
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const buildAllStandaloneBundles = async (): Promise<void> => {
  await buildStandaloneBundles.exec()
}
