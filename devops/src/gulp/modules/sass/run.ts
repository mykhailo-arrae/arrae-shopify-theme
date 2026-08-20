import Path from 'node:path'
import { compileStringAsync } from 'sass-embedded'
import type { Logger } from '../../../core/logger/index.js'
import { workdir } from '../../../core/process/workdir.js'
import {
  makeLogSassError,
  makeSassLogger
} from '../../../core/styles/sass-logger.js'

export type Params = {
  filename: string
  fileLoadPath: string
  includePaths?: string[]
}

type FactoryParams = {
  logger: Logger
  silent?: boolean
}

export const makeRunSass = async ({
  logger: _logger,
  silent = false
}: FactoryParams) => {
  const logger = _logger.with({ name: 'sass' })

  return async ({
    filename,
    fileLoadPath: _fileLoadPath,
    includePaths = []
  }: Params): Promise<string> => {
    const logSassError = makeLogSassError({
      logger,
      details: {
        loadPath: _fileLoadPath,
        filename
      }
    })

    try {
      const fileLoadPath = Path.resolve(workdir, _fileLoadPath)

      const preamble = Path.relative(
        fileLoadPath,
        Path.resolve(workdir, './devops/src/core/styles/preamble.scss')
      )

      const input = `
        @use ${JSON.stringify(preamble)};
        @use ${JSON.stringify(filename)};
      `

      const filePath = Path.relative(workdir, Path.join(fileLoadPath, filename))

      const { css } = await compileStringAsync(input, {
        loadPaths: [...includePaths, fileLoadPath],
        sourceMap: false,
        style: 'expanded',
        logger: makeSassLogger({
          logger: { type: 'pino', logger },
          silent,
          filePath,
          filename
        })
      })

      return css
    } catch (_err: unknown) {
      const err = logSassError(_err)
      throw err
    }
  }
}
