import fs from 'node:fs/promises'
import { from, reduce } from '@reactivex/ix-esnext-cjs/asynciterable/index.js'
import {
  buffer,
  tap
} from '@reactivex/ix-esnext-cjs/asynciterable/operators/index.js'
import { transform } from 'lightningcss'
import { isMatch } from 'picomatch'
import { compileAsync } from 'sass-embedded'
import { glob } from 'tinyglobby'
import { DevOpsError } from '../../core/errors/index.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { inferMaxConcurrency } from '../../core/process/concurrency.js'
import { workdir } from '../../core/process/workdir.js'
import { makeBaseLightningCssOptions } from '../../core/styles/lightningcss-settings.js'
import { LOAD_PATHS } from '../../core/styles/sass-settings.js'

const NAME = 'codegen-css-module-typedefs'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

const baseOptions = makeBaseLightningCssOptions({
  mode: 'css-module',
  cssModuleName: null
})

const generate = async (filepath: string): Promise<void> => {
  const { css } = await compileAsync(filepath, {
    sourceMap: false,
    logger: {
      debug(message, options) {
        logger.trace('{message}', { ...options, message })
      },
      warn(message, options) {
        logger.trace('{message}', { ...options, message })
      }
    },
    loadPaths: LOAD_PATHS
  })

  const { exports, warnings } = transform({
    ...baseOptions,
    code: Buffer.from(css),
    filename: filepath,
    minify: false
  })

  if (exports == null) {
    return
  }

  if (warnings.length) {
    warnings.forEach(({ loc, message, type }) => {
      logger.trace('{message}', { filepath, loc, message, type })
    })
  }

  const classnames = Object.keys(exports)

  const stylenames = classnames
    .sort()
    .reduce<Record<string, string>>((acc, name) => {
      acc[name] = name
      return acc
    }, {})

  const resultType: string =
    classnames.length === 0
      ? 'Record<string, never>'
      : JSON.stringify(stylenames, null, 2)

  const _typedef = `
/* DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:codegen] */
export type Styles = ${resultType}

export type ClassNames = keyof Styles

declare const styles: Styles

export default styles
`

  const typedef = [_typedef.trim(), '\n'].join('')

  const destinationPath = [filepath, '.d.ts'].join('')

  await fs.writeFile(destinationPath, typedef, { encoding: 'utf-8' })
}

const GLOB_PATTERN = '_js/**/style.module.scss'

export const codegenCssModuleTypedefs: Task = {
  name: NAME,
  exec: async (events = []): Promise<void> => {
    const concurrency = inferMaxConcurrency((totalCores) => totalCores - 2)

    logger.trace('Concurrency: {concurrency}', { concurrency })

    try {
      const allPaths: string[] =
        events.length > 0
          ? events.flatMap(({ type, path }) => {
              if (type === 'remove') {
                return []
              }

              return isMatch(path, GLOB_PATTERN, { cwd: workdir }) ? [path] : []
            })
          : await glob(GLOB_PATTERN, {
              cwd: workdir,
              onlyFiles: true
            })

      if (allPaths.length === 0) {
        logger.trace('No files found')
        return
      }

      logger.trace('Generating type definitions for {count} CSS Module files', {
        paths: allPaths,
        count: allPaths.length
      })

      const steps = reduce<string[], number>(
        from(allPaths).pipe(
          buffer(concurrency),
          tap(async (paths) => {
            const results = await Promise.allSettled(paths.map(generate))

            results.forEach((result, resultIndex) => {
              if (result.status === 'rejected') {
                throw new DevOpsError('Failed to genenerate type definitions', {
                  path: paths.at(resultIndex),
                  batch: paths,
                  err: result.reason,
                  traceTag: '77a4b7d1f7cf46e6b276d1b4b4e7d5d9'
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

      logger.info('{count} type definitions generated', {
        count: totalProcessed
      })
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const codegenAllCssModuleTypedefs = async (): Promise<void> => {
  await codegenCssModuleTypedefs.exec()
}
