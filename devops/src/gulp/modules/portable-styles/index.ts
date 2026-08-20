import Path from 'node:path'
import mqpacker from '@hail2u/css-mqpacker'
import postcss from 'postcss'
import type { Logger } from '../../../core/logger/index.js'
import { LOAD_PATHS } from '../../../core/styles/sass-settings.js'
import { makeRunSass } from '../sass/run.js'
import { makeBuildCssModule, type Result } from './css-module/index.js'

const mqProcessor = postcss([mqpacker()])

type FactoryParams = {
  logger: Logger
  silent?: boolean
}

type Params = {
  fileLoadPath: string
  filename: string
  moduleName: string
}

const DISABLE_MQPACKER_PRAGMA = '@mqpacker off'

export const makeBuildPortableStyles = async ({
  logger,
  silent = false
}: FactoryParams) => {
  const runSass = await makeRunSass({ logger, silent })
  const buildCssModule = makeBuildCssModule(logger)

  return async ({
    fileLoadPath,
    filename,
    moduleName
  }: Params): Promise<Result> => {
    const filePath = Path.join(fileLoadPath, filename)

    const code = await runSass({
      fileLoadPath,
      filename,
      includePaths: LOAD_PATHS
    }).then(async (css) => {
      const skipMediaQueryPacking: boolean = css.includes(
        DISABLE_MQPACKER_PRAGMA
      )

      if (skipMediaQueryPacking) {
        logger.trace('Skipping media packing for {fileLoadPath}/{filename}', {
          fileLoadPath,
          filename
        })
        return css
      }

      const result = await mqProcessor.process(css, {
        from: filePath,
        to: undefined
      })

      return result.css
    })

    const { stylenames, stylesheet, tsModule } = await buildCssModule({
      code,
      moduleName,
      path: filePath
    })

    return { stylenames, stylesheet, tsModule } satisfies Result
  }
}
