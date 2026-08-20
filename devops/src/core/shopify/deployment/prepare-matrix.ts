import fs from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { argv, stdout } from 'bun'
import { z } from 'devops-zod4'
import { DevOpsError } from '../../errors/index.js'
import { initLogger } from '../../logger/index.js'
import { DeploymentMatrix } from './matrix.js'
import { DeploymentTarget } from './target.js'

const logger = initLogger().with({ name: 'prepare-deployment-matrix' })

const Args = z.object({
  file: z.string().min(1),
  target: DeploymentTarget
})

/**
 * Run `bb devops-build-ci-scripts` if you change this file or its imports
 */
const run = async (): Promise<void> => {
  const { values: _args } = parseArgs({
    args: argv,
    strict: true,
    options: {
      file: {
        type: 'string',
        short: 'f'
      },
      target: {
        type: 'string',
        short: 't'
      }
    },
    allowPositionals: true
  })

  const ArgsResult = await Args.safeParseAsync(_args)

  if (ArgsResult.success === false) {
    logger.error('Failed to parse CLI arguments:\n{report}', {
      report: z.prettifyError(ArgsResult.error)
    })
    throw new DevOpsError('Failed to parse CLI arguments')
  }

  const { file, target } = ArgsResult.data

  const _matrix = await fs
    .readFile(file, 'utf-8')
    .then((s) => {
      return JSON.parse(s)
    })
    .catch((err) => {
      throw new DevOpsError('Failed to read matrix file', { file, err })
    })

  const matrixResult = await DeploymentMatrix.safeParseAsync(_matrix)

  if (matrixResult.success === false) {
    throw new DevOpsError('Failed to parse matrix input', {
      message: matrixResult.error.issues[0]?.message,
      path: matrixResult.error.issues[0]?.path.join('.')
    })
  }

  const matrix = matrixResult.data.byTarget[target]

  await stdout.write(JSON.stringify(matrix))
}

run().catch((err: unknown) => {
  throw err
})
