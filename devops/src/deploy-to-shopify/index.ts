import { argv } from 'node:process'
import { parseArgs } from 'node:util'
import { initLogger } from '../core/logger/index.js'
import { makeLogErrorDetails } from '../core/logger/log-error-details.js'
import { validateContentOverridePatterns } from './config/content-override-patterns/validate-patterns.js'
import { type CliArgs, parseRuntimeConfig } from './config/index.js'
import { populateTargetTheme } from './modules/populate.js'
import { prepareDeploymentBranch } from './modules/prepare.js'

const topLogger = initLogger().with({ name: 'deploy-to-shopify' })
const logErrorDetails = makeLogErrorDetails(topLogger)

const run = async (): Promise<void> => {
  const { values: args } = parseArgs({
    args: argv,
    strict: true,
    options: {
      contentOverridePatterns: {
        type: 'string',
        short: 'C'
      },
      initialContentSource: {
        type: 'string'
      },
      step: {
        type: 'string',
        short: 's'
      },
      target: {
        type: 'string',
        short: 't'
      }
    } as const satisfies Record<keyof CliArgs, unknown>,
    allowPositionals: true
  })

  const config = await parseRuntimeConfig({ args, env: process.env })

  const {
    credentials,
    options: { contentOverridePatterns, step, target }
  } = config

  const logger = topLogger.with({ name: `deploy-to-${target}-${step}` })

  if (step === 'prepare') {
    await validateContentOverridePatterns({
      logger,
      patterns: contentOverridePatterns
    })

    logger.debug('Preparing deployment branch')
    await prepareDeploymentBranch({ logger, config })
    return
  }

  step satisfies 'populate'

  logger.debug('Populating target theme')
  await populateTargetTheme({ logger, target, credentials })
}

run().catch((_err: unknown) => {
  const err = logErrorDetails(_err)
  throw err
})
