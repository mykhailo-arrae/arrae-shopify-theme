import { writeFile } from 'node:fs/promises'
import Path from 'node:path'
import { compileStringAsync } from 'sass-embedded'
import { DevOpsError } from '../../core/errors/index.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { kebabCase } from '../../core/string/kebab-case.js'
import {
  makeLogSassError,
  makeSassLogger
} from '../../core/styles/sass-logger.js'
import { LOAD_PATHS } from '../../core/styles/sass-settings.js'
import { MINUTE_IN_MS } from '../../core/time/constants.js'
import { makeBuildCssModule } from '../modules/portable-styles/css-module/index.js'

const logger = initLogger().with({ name: 'ssr-wc-styles' })
const logErrorDetails = makeLogErrorDetails(logger)

export const buildWebComponentSsrStyles = async (): Promise<void> => {
  const { execa } = await import('execa9')
  const logSassError = makeLogSassError({ logger })
  const buildCssModule = makeBuildCssModule(logger)

  const SOURCE_PATH = '_js/web-components'

  const banner = `/* DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${SOURCE_PATH}/*/ssr.scss}] */`

  try {
    const { stdout, stderr } = await execa(
      'fdfind',
      [
        '--color=never',
        '--type=file',
        '--extension=scss',
        '--exact-depth=2',
        '--search-path',
        SOURCE_PATH,
        '--glob',
        'ssr.scss'
      ],
      { cwd: workdir, timeout: 1 * MINUTE_IN_MS, lines: true }
    )

    stderr.forEach((line) => {
      logger.warn(line)
    })

    const imports = stdout.flatMap((_line) => {
      const line = _line.trim()

      if (line.length === 0) {
        return []
      }

      return [`@use "${line}" as ${kebabCase(line)};`]
    })

    const outputPath = Path.resolve(themedir, 'assets', 'wc-ssr.css')

    if (imports.length === 0) {
      await writeFile(outputPath, [banner, ''].join('\n'), {
        encoding: 'utf-8'
      })

      return
    }

    logger.trace('Found style paths', { imports })

    const input = imports.join('\n')

    const [sassErr, sassResult] = await safeAwait(
      compileStringAsync(input, {
        loadPaths: [...LOAD_PATHS, workdir],
        sourceMap: false,
        style: 'expanded',
        logger: makeSassLogger({ logger: { type: 'pino', logger } })
      })
    )

    if (sassErr) {
      throw logSassError(sassErr)
    }

    const [cssModuleErr, cssModuleResult] = await safeAwait(
      buildCssModule({
        code: Buffer.from(sassResult.css),
        moduleName: 'wc-ssr',
        path: outputPath
      })
    )

    if (cssModuleErr) {
      throw new DevOpsError('Failed to compile CSS Module')
    }

    const fileContent = [banner, cssModuleResult.stylesheet, ''].join('\n')

    await writeFile(outputPath, fileContent, { encoding: 'utf-8' })

    logger.info('Compiled SSR styles for Web Components')
  } catch (_err: unknown) {
    const err = logErrorDetails(_err)

    throw err
  }
}
