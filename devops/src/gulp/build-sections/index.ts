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
import { buildSection } from './build-section.js'
import { FOLDER } from './constants.js'

const NAME = 'build-sections'

const logger = initLogger().with({ name: NAME })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildSections: Task = {
  name: NAME,
  exec: async (events = []): Promise<void> => {
    const concurrency = inferMaxConcurrency((totalCores) => totalCores - 2)

    logger.trace('Concurrency: {concurrency}', { concurrency })

    try {
      const sectionNames = new Set<string>()

      if (events.length) {
        events.forEach(({ type, path }) => {
          if (type === 'remove') {
            return
          }

          const sectionName = Path.relative(
            Path.resolve(workdir, FOLDER),
            Path.resolve(workdir, path)
          )
            .split(Path.sep)
            .at(0)

          if (sectionName) {
            sectionNames.add(sectionName)
          }
        })
      } else {
        const sectionPaths = await glob('**/section.liquid', {
          cwd: Path.resolve(workdir, FOLDER),
          nodir: true,
          signal: AbortSignal.timeout(10_000)
        })

        sectionPaths.forEach((relPath) => {
          sectionNames.add(Path.basename(Path.dirname(relPath)))
        })
      }

      if (sectionNames.size === 0) {
        logger.trace('No sections found')
        return
      }

      if (sectionNames.size > 5) {
        logger.trace('Compiling {count} sections', {
          count: sectionNames.size,
          sections: [...sectionNames].sort()
        })
      } else {
        logger.trace('Compiling {count} sections: {sections}', {
          count: sectionNames.size,
          sections: [...sectionNames].sort().join(', ')
        })
      }

      const steps = reduce<string[], number>(
        from(sectionNames).pipe(
          buffer(concurrency),
          tap(async (names) => {
            logger.trace('Building portable sections - {sections}', {
              sections: names.join(', ')
            })

            const results = await Promise.allSettled(
              names.map((sectionName) => {
                return buildSection(sectionName)
              })
            )

            results.forEach((result, resultIndex) => {
              if (result.status === 'rejected') {
                throw new DevOpsError('Some sections cannot be built', {
                  section: names.at(resultIndex),
                  batch: names,
                  err: result.reason,
                  traceTag: '05c715aceeae4c80ba377c899d94bb0d'
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

      logger.info('{count} sections compiled', { count: totalProcessed })
    } catch (_err) {
      const err = logErrorDetails(_err)

      throw err
    }
  }
}

export const buildAllSections = async (): Promise<void> => {
  await buildSections.exec()
}
