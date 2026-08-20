import Path from 'node:path'
import { from, reduce } from '@reactivex/ix-esnext-cjs/asynciterable/index.js'
import {
  buffer,
  tap
} from '@reactivex/ix-esnext-cjs/asynciterable/operators/index.js'
import { glob } from 'glob'
import { DevOpsError } from '../../core/errors/index.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { inferMaxConcurrency } from '../../core/process/concurrency.js'
import { workdir } from '../../core/process/workdir.js'
import { buildSnippet } from './build-snippet.js'
import { FOLDER } from './constants.js'

const NAME = 'build-snippets'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildSnippets: Task = {
  name: NAME,
  exec: async (events = []): Promise<void> => {
    const concurrency = inferMaxConcurrency((totalCores) => totalCores - 2)

    logger.trace('Concurrency: {concurrency}', { concurrency })

    try {
      const snippetNames = new Set<string>()

      if (events.length) {
        events.forEach(({ type, path }) => {
          if (type === 'remove') {
            return
          }

          const snippetName = Path.relative(
            Path.resolve(workdir, FOLDER),
            Path.resolve(workdir, path)
          )
            .split(Path.sep)
            .at(0)

          if (snippetName) {
            snippetNames.add(snippetName)
          }
        })
      } else {
        const snippetPaths = await glob('**/snippet.liquid', {
          cwd: Path.resolve(workdir, FOLDER),
          nodir: true,
          signal: AbortSignal.timeout(10_000)
        })

        snippetPaths.forEach((relPath) => {
          snippetNames.add(Path.basename(Path.dirname(relPath)))
        })
      }

      if (snippetNames.size === 0) {
        logger.trace('No snippets found')
        return
      }

      if (snippetNames.size > 5) {
        logger.trace('Compiling {count} snippets', {
          count: snippetNames.size,
          snippets: [...snippetNames].sort()
        })
      } else {
        logger.trace('Compiling {count} snippets: {snippets}', {
          count: snippetNames.size,
          snippets: [...snippetNames].sort().join(', ')
        })
      }

      const steps = reduce<string[], number>(
        from(snippetNames).pipe(
          buffer(concurrency),
          tap(async (names) => {
            logger.trace('Building portable snippets - {snippets}', {
              snippets: names.join(', ')
            })

            const results = await Promise.allSettled(
              names.map((snippetName) => {
                return buildSnippet(snippetName)
              })
            )

            results.forEach((result, resultIndex) => {
              if (result.status === 'rejected') {
                throw new DevOpsError('Some snippets cannot be built', {
                  snippet: names.at(resultIndex),
                  batch: names,
                  err: result.reason,
                  traceTag: 'cde5745e2add46dcae213ec0fc231425'
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

      logger.info('{count} snippets compiled', { count: totalProcessed })
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const buildAllSnippets = async (): Promise<void> => {
  await buildSnippets.exec()
}
