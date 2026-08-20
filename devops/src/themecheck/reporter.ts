import fs from 'node:fs'
import Path from 'node:path'
import readline from 'node:readline'
import { text } from 'node:stream/consumers'
import { format } from 'node:util'
import { sort } from 'fast-sort'
import { unique } from 'remeda'
import { DevOpsError } from '../core/errors/index.js'
import { checkFileCanBeRead } from '../core/fs/check-file-access.js'
import { initLogger } from '../core/logger/index.js'
import { makeLogErrorDetails } from '../core/logger/log-error-details.js'
import { workdir } from '../core/process/workdir.js'
import { isPresent } from '../core/typescript/is-present.js'
import { Report, type ReportEntry } from './input.js'

const readFirstLine = async (filePath: string) => {
  const fileStream = fs.createReadStream(Path.resolve(workdir, filePath))
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Number.POSITIVE_INFINITY
  })

  // Close stream as soon as we get the first line
  for await (const line of rl) {
    rl.close()
    return line
  }

  // Return null if file is empty
  return null
}

const logger = initLogger().with({ name: 'themecheck' })
const logErrorDetails = makeLogErrorDetails(logger)

type ExtendedReportEntry = ReportEntry & { sourcePath?: string }

const run = async (): Promise<void> => {
  const _stdin = await text(process.stdin)

  const stdin = _stdin.trim()

  if (stdin.length === 0) {
    throw new DevOpsError('Stdin is empty')
  }

  const __files = await Report.parseAsync(JSON.parse(stdin))

  const _files = await Promise.all(
    __files.map(
      async ({
        path: _path,
        ...entry
      }): Promise<ExtendedReportEntry | null> => {
        const path = Path.relative(workdir, Path.resolve(workdir, _path))

        const firstLine = await readFirstLine(path)

        if (firstLine == null) {
          logger.trace('File is empty: {path}', { path })
          return null
        }

        if (firstLine.includes('build-fingerprint')) {
          const match = /build-fingerprint:assets:source={(.+?)}/.exec(
            firstLine
          )
          const sourcePath = match ? match[1] : null

          if (sourcePath == null) {
            logger.debug('Source path cannot be extracted: {path}', { path })
            return { ...entry, path }
          }

          const sourcePathExists = await checkFileCanBeRead(sourcePath)

          if (sourcePathExists === false) {
            logger.debug('Source file not found for {path}', {
              path,
              sourcePath
            })
            return { ...entry, path }
          }

          return { ...entry, path, sourcePath }
        }

        return {
          ...entry,
          path
        }
      }
    )
  )

  const files = sort(
    _files.filter(isPresent).flatMap(({ offenses: _offences, ...file }) => {
      const offenses = _offences.filter((o) => {
        // Skip "UndefinedObject" false positives for portables
        if (file.path.startsWith('_js') && o.check === 'UndefinedObject') {
          return false
        }

        return true
      })

      if (offenses.length === 0) {
        return []
      }

      const warningCount = offenses.reduce<number>((acc, o) => {
        return o.severity === 'warn' ? acc + 1 : acc
      }, 0)

      const infoCount = offenses.reduce<number>((acc, o) => {
        return o.severity === 'info' ? acc + 1 : acc
      }, 0)

      const errorCount = offenses.reduce<number>((acc, o) => {
        return o.severity === 'error' ? acc + 1 : acc
      }, 0)

      return [
        {
          ...file,
          offenses,
          errorCount,
          infoCount,
          warningCount
        }
      ]
    })
  ).asc((f): string => f.sourcePath || f.path)

  files.forEach(({ offenses, path, sourcePath, warningCount, infoCount }) => {
    const totalCount = warningCount + infoCount

    if (totalCount === 0) {
      return
    }

    const fileReportingLevel: 'warn' | 'info' =
      warningCount > 0 ? 'warn' : 'info'

    const firstLine = sourcePath
      ? format(
          '%s - %s: %d %s, %d %s',
          sourcePath,
          path,
          warningCount,
          warningCount === 1 ? 'warning' : 'warnings',
          infoCount,
          infoCount === 1 ? 'note' : 'notes'
        )
      : format(
          '%s: %d %s, %d %s',
          path,
          warningCount,
          warningCount === 1 ? 'warning' : 'warnings',
          infoCount,
          infoCount === 1 ? 'note' : 'notes'
        )

    const sublines = offenses.flatMap((offense) => {
      if (offense.severity === 'error') {
        return []
      }

      return [
        format(
          '%s: %s @ Ln %d Col %d - Ln %d Col %d',
          offense.check,
          offense.message,
          offense.start_row,
          offense.start_column,
          offense.end_row,
          offense.end_column
        )
      ]
    })

    logger[fileReportingLevel]([firstLine, ...sublines].join('\n'))
  })

  // Log all errors as one block at the end of the report
  const filesWithErrors = files.filter(({ errorCount }) => {
    return errorCount > 0
  })

  filesWithErrors.forEach(
    ({ offenses: _offences, path, sourcePath, errorCount }) => {
      const offenses = _offences.filter((o) => o.severity === 'error')

      const firstLine = sourcePath
        ? format(
            '%s - %s: %d %s',
            sourcePath,
            path,
            errorCount,
            errorCount === 1 ? 'error' : 'errors'
          )
        : format(
            '%s: %d %s',
            path,
            errorCount,
            errorCount === 1 ? 'error' : 'errors'
          )

      const sublines = offenses.flatMap((offense) => {
        return [
          format(
            '%s: %s @ Ln %d Col %d - Ln %d Col %d',
            offense.check,
            offense.message,
            offense.start_row,
            offense.start_column,
            offense.end_row,
            offense.end_column
          )
        ]
      })

      logger.error([firstLine, ...sublines].join('\n'))
    }
  )

  if (filesWithErrors.length > 0) {
    const filePaths = unique(
      filesWithErrors
        .map(({ path, sourcePath }) => (sourcePath ? sourcePath : path))
        .sort()
    )

    logger.error('Errors detected in {count} {pluralizedFiles}', {
      files: filePaths,
      count: filePaths.length,
      pluralizedFiles: filePaths.length === 1 ? 'file' : 'files'
    })
    return
  }

  logger.info('End of report')
}

run().catch((_err: unknown) => {
  logErrorDetails(_err)

  process.exit(1)
})
