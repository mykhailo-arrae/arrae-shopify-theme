import Path from 'node:path'
import { DevOpsError } from './core/errors/index.js'
import { initLogger } from './core/logger/index.js'
import { makeLogErrorDetails } from './core/logger/log-error-details.js'
import { workdir } from './core/process/workdir.js'
import { LOAD_PATHS } from './core/styles/sass-settings.js'
import { makeRunSass } from './gulp/modules/sass/run.js'

const logger = initLogger().with({ name: 'stylecheck' })
const logErrorDetails = makeLogErrorDetails(logger)

const run = async () => {
  const [, , _filepath] = process.argv

  if (_filepath == null) {
    throw new DevOpsError('Module filepath is required')
  }

  const filepath = Path.relative(workdir, Path.resolve(workdir, _filepath))

  const filename = Path.basename(filepath)
  const fileLoadPath = Path.dirname(filepath)

  const runSass = await makeRunSass({ logger })

  logger.trace('Checking {filepath}', { filepath })

  await runSass({ filename, fileLoadPath, includePaths: LOAD_PATHS })

  logger.trace('Finished checking {filepath}', { filepath })
}

run().catch((err: unknown) => {
  logErrorDetails(err)
  process.exit(1)
})
