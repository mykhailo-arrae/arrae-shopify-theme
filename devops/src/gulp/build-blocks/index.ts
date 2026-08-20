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
import { buildBlock } from './build-block.js'
import { FOLDER } from './constants.js'

const NAME = 'build-blocks'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildBlocks: Task = {
  name: NAME,
  exec: async (events = []): Promise<void> => {
    const concurrency = inferMaxConcurrency((totalCores) => totalCores - 2)

    logger.trace('Concurrency: {concurrency}', { concurrency })

    try {
      const blockNames = new Set<string>()

      if (events.length) {
        events.forEach(({ type, path }) => {
          if (type === 'remove') {
            return
          }

          const blockName = Path.relative(
            Path.resolve(workdir, FOLDER),
            Path.resolve(workdir, path)
          )
            .split(Path.sep)
            .at(0)

          if (blockName) {
            blockNames.add(blockName)
          }
        })
      } else {
        const blockPaths = await glob('**/block.liquid', {
          cwd: Path.resolve(workdir, FOLDER),
          nodir: true,
          signal: AbortSignal.timeout(10_000)
        })

        blockPaths.forEach((relPath) => {
          blockNames.add(Path.basename(Path.dirname(relPath)))
        })
      }

      if (blockNames.size === 0) {
        logger.trace('No blocks found')
        return
      }

      if (blockNames.size > 5) {
        logger.trace('Compiling {count} blocks', {
          count: blockNames.size,
          blocks: [...blockNames].sort()
        })
      } else {
        logger.trace('Compiling {count} blocks: {blocks}', {
          count: blockNames.size,
          blocks: [...blockNames].sort().join(', ')
        })
      }

      const steps = reduce<string[], number>(
        from(blockNames).pipe(
          buffer(concurrency),
          tap(async (names) => {
            logger.trace('Building portable blocks - {blocks}', {
              blocks: names.join(', ')
            })

            const results = await Promise.allSettled(
              names.map((blockName) => {
                return buildBlock(blockName)
              })
            )

            results.forEach((result, resultIndex) => {
              if (result.status === 'rejected') {
                throw new DevOpsError('Some blocks cannot be built', {
                  block: names.at(resultIndex),
                  batch: names,
                  err: result.reason,
                  traceTag: 'c8d9e0f1a2b34c5d6e7f8a9b0c1d2e3f'
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

      logger.info('{count} blocks compiled', { count: totalProcessed })
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const buildAllBlocks = async (): Promise<void> => {
  await buildBlocks.exec()
}
