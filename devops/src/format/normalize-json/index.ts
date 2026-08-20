import fs from 'node:fs/promises'
import { argv } from 'node:process'
import { DevOpsError } from '../../core/errors/index.js'
import { initLogger } from '../../core/logger/index.js'
import { makeHandleRejection } from '../../core/process/handle-rejection.js'
import { workdir } from '../../core/process/workdir.js'

const logger = initLogger().with({ name: 'normalize-json' })

const run = async (): Promise<void> => {
  const { execa } = await import('execa9')
  const { default: stripJsonComments } = await import('strip-json-comments')

  const formatAndSort = async (filepath: string): Promise<void> => {
    logger.trace('Formatting and sorting keys in {filepath}', { filepath })
    const _content = await fs
      .readFile(filepath, { encoding: 'utf-8' })
      .catch((err: unknown) => {
        throw new DevOpsError('Failed to read file', { filepath, err })
      })

    const content = stripJsonComments(_content, {
      trailingCommas: true,
      whitespace: true
    })

    try {
      JSON.parse(content)
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new DevOpsError('Invalid JSON', { filepath, err })
      }
    }

    await execa('jq', ['--sort-keys', '.'], {
      input: content,
      cwd: workdir,
      stdout: { file: filepath }
    })
  }

  const [, , ..._filepaths] = argv

  const filepaths = _filepaths.filter((filepath) => {
    return filepath
  })

  if (filepaths.length === 0) {
    throw new DevOpsError('No file paths provided', { argv })
  }

  await Promise.all(filepaths.map(formatAndSort))
}

run().catch(makeHandleRejection({ logger }))
