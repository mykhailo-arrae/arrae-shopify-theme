import { argv, env } from 'node:process'
import { parseArgs } from 'node:util'
import { rspack } from '@rspack/core'
import { z } from 'devops-zod4'
import { DevOpsError } from '../core/errors/index.js'
import { initLogger } from '../core/logger/index.js'
import { makeLogErrorDetails } from '../core/logger/log-error-details.js'
import initConfig from './config.js'
import { makeReporter } from './reporter.js'

const logger = initLogger().with({ name: 'rspack' })
const logErrorDetails = makeLogErrorDetails(logger)

const CliArgs = z.object({
  watch: z.boolean().optional().default(false)
})

const run = async () => {
  const { values: _cliArgs } = parseArgs({
    args: argv,
    strict: true,
    options: {
      watch: {
        type: 'boolean',
        short: 'w'
      }
    },
    allowPositionals: true
  })

  const CliArgsResult = await CliArgs.safeParseAsync(_cliArgs)

  if (CliArgsResult.success === false) {
    logger.error('Failed to parse CLI arguments:\n{issues}', {
      issues: z.prettifyError(CliArgsResult.error)
    })
    throw new DevOpsError('Failed to parse CLI arguments')
  }

  const { watch: shouldWatch } = CliArgsResult.data

  const config = await initConfig(env, argv)

  const compiler = rspack(config)

  await new Promise<void>((resolve, reject): void => {
    const reporter = makeReporter({
      compiler,
      mode: shouldWatch ? 'watch' : 'build',
      logger,
      resolve,
      reject
    })

    if (shouldWatch) {
      compiler.watch({ aggregateTimeout: 100 }, reporter)
      return
    }

    compiler.run(reporter)
  })
}

run()
  .then(() => {
    logger.trace('Rspack runtime finished')
  })
  .catch((_err: unknown) => {
    const err = logErrorDetails(_err)

    throw err
  })
