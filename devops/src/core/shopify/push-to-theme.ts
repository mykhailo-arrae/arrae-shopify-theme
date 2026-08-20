import { EOL } from 'node:os'
import { chunk } from 'remeda'
import { glob } from 'tinyglobby'
import { DevOpsError } from '../errors/index.js'
import type { Logger } from '../logger/index.js'
import { workdir } from '../process/workdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'
import { isPresent } from '../typescript/is-present.js'

const truncateLogs = (_lines: string[]): string[] => {
  const lines = _lines.filter((line) => line)

  if (lines.length <= 240) {
    return lines
  }

  const head = lines.slice(0, 24)
  const tail = lines.slice(-24)

  return [...head, '# ...TRUNCATED', ...tail]
}

const cleanLogs = (lines: string[]): string[] => {
  return lines.flatMap((_line) => {
    const line = _line
      .split(EOL)
      .filter((l) => l)
      .join(' ')
      .trim()

    return line ? [line] : []
  })
}

export type PushToThemeInput = {
  logger: Logger
  themeId: number
  globs: string[] | null
}

/**
 * Pushes files to a Shopify theme
 *
 * Supply a list of glob strings to push only particular files
 *
 * The utility will push all theme files if globs are not provided.
 */
export const pushToTheme = async ({
  logger,
  themeId,
  globs
}: PushToThemeInput): Promise<void> => {
  if (Number.isNaN(themeId) || themeId <= 0) {
    throw new DevOpsError('Theme ID is invalid', {
      themeId,
      traceTag: '3854675c7a91475b8a23bf0151b7bd77'
    })
  }

  const { execa } = await import('execa9')

  const deploy = async (paths?: string[]): Promise<void> => {
    if (paths == null) {
      logger.debug('Pushing all files to Shopify')
    }

    logger.trace(
      paths == null
        ? 'Pushing all files to Shopify'
        : 'Pushing some files to Shopify',
      { paths }
    )

    const pathArgs =
      paths != null
        ? paths.flatMap((path): ['-o', string] => {
            return ['-o', path]
          })
        : []

    const result = await execa(
      'shopify',
      ['theme', 'push', '-t', themeId.toString(), ...pathArgs],
      {
        cwd: workdir,
        lines: true,
        reject: false,
        timeout: 5 * MINUTE_IN_MS
      }
    )

    const { stderr: _stderr, stdout: _stdout } = result

    const stdout = truncateLogs(cleanLogs(_stdout))
    const stderr = truncateLogs(cleanLogs(_stderr))

    const output = [...stdout, ...stderr]

    output.forEach((line) => {
      logger.trace(line)
    })

    if (result.failed) {
      if (result.shortMessage) {
        logger.error(result.shortMessage)
      }

      throw new DevOpsError('Failed to push theme files')
    }

    /**
     * Report Shopify CLI upload warnings as errors
     *
     * Shopify CLI exits with a success code (zero) even if the theme was pushed with errors
     */

    const failedToUploadRegex = /failed to upload/i
    const errorLines = output.flatMap((line, index, allLines): string[] => {
      const hasFailedToUpload = failedToUploadRegex.test(line)

      if (hasFailedToUpload) {
        return [line, allLines[index + 1]].filter(isPresent)
      }

      return []
    })

    const pushedWithErrorsRegex = /with errors/i
    const warningLines = output.flatMap((line, index, allLines): string[] => {
      const hasPushedWithErrors: boolean = pushedWithErrorsRegex.test(line)

      if (hasPushedWithErrors) {
        // Get 10 lines of context before and after the error line
        const start = Math.max(0, index - 10)
        // +11 to include next 10 lines
        const end = Math.min(allLines.length, index + 11)
        const lineWithContext: string[] = allLines.slice(start, end)

        return lineWithContext
      }

      return []
    })

    const commandHasFailed: boolean =
      errorLines.length > 0 || warningLines.length > 0

    if (commandHasFailed) {
      errorLines.forEach((line) => {
        logger.error(line)
      })

      warningLines.forEach((line) => {
        logger.error(line)
      })

      throw new DevOpsError('Failed to push theme files', { themeId, globs })
    }
  }

  if (globs == null) {
    await deploy()
    return
  }

  const allPaths = await glob(globs, { cwd: workdir, deep: 5, onlyFiles: true })

  if (allPaths.length === 0) {
    logger.warn('No files found matching {patterns}', { patterns: globs })
    return
  }

  const pathChunks = chunk(allPaths, 20)

  for (const paths of pathChunks) {
    await deploy(paths)
  }
}
