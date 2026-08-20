import Path from 'node:path'
import mqpacker from '@hail2u/css-mqpacker'
import autoprefixer from 'autoprefixer'
import gulp from 'gulp'
import postcss from 'gulp-postcss'
import rename from 'gulp-rename'
import vinylmap from 'vinyl-map2'
import { DevOpsError } from '../../core/errors/index.js'
import type { Task } from '../../core/fs/watcher/with-file-changes.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { pipeline } from '../../core/node/promisified-pipeline.js'
import { themedir } from '../../core/process/themedir.js'
import { workdir } from '../../core/process/workdir.js'
import { LOAD_PATHS } from '../../core/styles/sass-settings.js'
import { isPresent } from '../../core/typescript/is-present.js'
import { makeSassStream } from '../modules/sass/stream.js'

export type Params = {
  taskName: string
  entrypoints: string[]
  compileTo?: 'asset' | 'snippet'
  groupMediaQueries?: boolean
}

export const makeBuildStyles = ({
  taskName,
  entrypoints,
  compileTo = 'asset',
  groupMediaQueries = true
}: Params): Task => {
  if (taskName.length === 0) {
    throw new DevOpsError('Task name is required', {
      taskName,
      entrypoints,
      traceTag: 'eef41daa713e40278e7c4eb8e744b33a'
    })
  }

  const logger = initLogger().with({ name: taskName })
  const logErrorDetails = makeLogErrorDetails(logger)

  const destination: string =
    compileTo === 'snippet'
      ? Path.resolve(themedir, 'snippets')
      : Path.resolve(themedir, 'assets')

  return {
    name: taskName,
    exec: async (): Promise<void> => {
      if (entrypoints.length === 0) {
        logger.debug('No entrypoints provided, skipping styles compilation')
        return
      }

      try {
        const singlePass = [
          autoprefixer({
            flexbox: 'no-2009',
            grid: false,
            cascade: false
          }),
          groupMediaQueries ? mqpacker() : null
        ].filter(isPresent)

        const sassStream = await makeSassStream({ includePaths: LOAD_PATHS })

        const conditionalSteps: NodeJS.ReadWriteStream[] =
          compileTo === 'snippet'
            ? [
                vinylmap((output) =>
                  ['<style>', output.toString(), '</style>'].join('\n')
                ),
                rename((parsedPath) => {
                  parsedPath.extname = '.liquid'
                  return parsedPath
                })
              ]
            : [
                rename((parsedPath) => {
                  const { basename } = parsedPath
                  parsedPath.basename =
                    basename === 'master' ? 'main' : basename
                  parsedPath.extname = '.css'

                  return parsedPath
                })
              ]

        await pipeline([
          gulp.src(entrypoints, { cwd: workdir }),
          sassStream,
          postcss(singlePass),
          vinylmap((output, filepath) => {
            const relativePath = Path.relative(workdir, filepath)
            const bannerText = `/* DO NOT EDIT: This file is auto-generated and will be overwritten. [build-fingerprint:assets:source={${relativePath}}] */`

            return [bannerText, output.toString()].join('\n\n')
          }),
          ...conditionalSteps,
          gulp.dest(destination, { cwd: workdir })
        ])

        logger.info('Styles compiled')
      } catch (_err) {
        const err = logErrorDetails(_err)

        throw err
      }
    }
  }
}

export const buildInlineGlobalStyles = makeBuildStyles({
  taskName: 'build-inline-global-styles',
  entrypoints: ['_sass/inline-css.scss'],
  compileTo: 'snippet'
})

export const buildAllInlineGlobalStyles = async (): Promise<void> => {
  await buildInlineGlobalStyles.exec()
}

export const buildGlobalStyles = makeBuildStyles({
  taskName: 'build-global-styles',
  entrypoints: ['_sass/master.scss']
})

export const buildAllGlobalStyles = async (): Promise<void> => {
  await buildGlobalStyles.exec()
}
