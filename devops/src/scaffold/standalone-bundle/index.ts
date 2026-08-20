import fs from 'node:fs/promises'
import Path from 'node:path'
import input from '@inquirer/input'
import select from '@inquirer/select'
import { z } from 'devops-zod4'
import prettier from 'prettier'
import type { StandaloneBundle } from '../../core/bundle/standalone/schema.js'
import { safeAwait } from '../../core/errors/safe-await.js'
import { initLogger } from '../../core/logger/index.js'
import { makeLogErrorDetails } from '../../core/logger/log-error-details.js'
import { workdir } from '../../core/process/workdir.js'

const logger = initLogger().with({ name: 'scaffold-standalone-bundle' })

const logErrorDetails = makeLogErrorDetails(logger)

const BundleName = z.string().min(2).trim()

export const main = async (): Promise<void> => {
  const _bundleName = await input({
    message: 'Enter bundle name',
    validate: (value) => {
      const result = BundleName.safeParse(value)
      return result.success ? true : result.error.message.trim()
    }
  })

  const bundleName = await BundleName.parseAsync(_bundleName)

  const type = await select<StandaloneBundle['type']>({
    message: 'Select bundle type',
    default: 'asset',
    choices: [
      {
        name: 'Asset',
        value: 'asset',
        description: `A js file in assets folder: assets/${bundleName}.js`
      },
      {
        name: 'Snippet',
        value: 'snippet',
        description: `A snippet with inline script tag: snippets/${bundleName}.liquid`
      }
    ]
  })

  const minify = await select<StandaloneBundle['minify']>({
    message: 'Minify output?',
    default: type === 'snippet' ? false : true,
    choices: [
      {
        name: 'Yes',
        value: true
      },
      {
        name: 'No',
        value: false
      }
    ]
  })

  const prettierOptions = await prettier.resolveConfig(workdir)

  const bundleWorkdir = Path.resolve(workdir, '_js/standalone', bundleName)

  const [bundleWorkdirErr] = await safeAwait(fs.mkdir(bundleWorkdir))

  if (bundleWorkdirErr) {
    const stat = await fs.stat(bundleWorkdir)

    if (stat.isDirectory() === false) {
      logger.error('Failed to create bundle folder')
      throw bundleWorkdirErr
    }

    logger.debug('Bundle folder already exists: {bundleWorkdir}', {
      bundleWorkdir
    })
  }

  logger.trace('Creating schema file')
  const schema: StandaloneBundle = {
    type,
    minify
  }

  const schemaContent = await prettier.format(JSON.stringify(schema, null, 2), {
    ...prettierOptions,
    parser: 'json'
  })
  await fs.writeFile(Path.resolve(bundleWorkdir, 'schema.json'), schemaContent)

  logger.trace('Creating entry file')
  const _entry = `
    const run = async () => {
      // eslint-disable-next-line no-constant-condition
      if (false) {
        console.warn('Unreachable code')
      }

      console.warn('This is a placeholder script')
    }

    run().catch((err) => {
      console.error(err)
    })
  `
  const entry = await prettier.format(_entry, {
    ...prettierOptions,
    parser: 'typescript'
  })
  await fs.writeFile(Path.resolve(bundleWorkdir, 'index.tsx'), entry)

  logger.info('Standalone bundle structure created')
}

main().catch(logErrorDetails)
