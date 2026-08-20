import { initLogger } from './core/logger/index.js'
import { discoverEntrypoints } from './core/webpack/entrypoints/index.js'
import { inferSourcePath } from './core/webpack/infer-source-path.js'
import { entry as baseEntry } from './webpack-entries.js'

const logger = initLogger().with({ name: 'devops' })

export const inferWebpackEntrypoints = async (): Promise<string[]> => {
  const { count, entry } = await discoverEntrypoints({
    baseEntry
  })

  logger.info('{count} bundle entries resolved', { count })

  const paths: string[] = Object.values(entry).filter(
    (path) => typeof path === 'string'
  )

  const allEntrypoints: string[] = []

  for (const path of paths) {
    const sourcePath = await inferSourcePath(path)

    if (sourcePath == null) {
      logger.error('No source file found for {path}', { path })
      continue
    }

    logger.trace('Found source file: {sourcePath} <- {path}', {
      sourcePath,
      path
    })
    allEntrypoints.push(sourcePath)
  }

  return allEntrypoints
}
