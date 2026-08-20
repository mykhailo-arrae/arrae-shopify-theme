import { initLogger } from './core/logger/index.js'
import { makeLogErrorDetails } from './core/logger/log-error-details.js'
import { inferWebpackEntrypoints } from './infer-webpack-entrypoints.js'

const logger = initLogger().with({ name: 'devops' })

export const run = async (): Promise<void> => {
  const entrypoints = await inferWebpackEntrypoints()

  process.stdout.write(entrypoints.join('\n'))
}

const logErrorDetails = makeLogErrorDetails(logger)

run().catch((_err: unknown) => {
  const err = logErrorDetails(_err)

  throw err
})
