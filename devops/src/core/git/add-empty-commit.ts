import { EOL } from 'node:os'
import { DevOpsError } from '../errors/index.js'
import { safeAwait } from '../errors/safe-await.js'
import type { Logger } from '../logger/index.js'
import { workdir } from '../process/workdir.js'

export type AddEmptyCommitInput = {
  logger: Logger
  message: string
}

export const addEmptyCommit = async ({
  logger,
  message: _message
}: AddEmptyCommitInput): Promise<void> => {
  const { execa } = await import('execa9')

  const message = _message.trim()

  if (message.length === 0) {
    throw new DevOpsError('Commit message cannot be empty')
  }

  const messageFlags = message.split(EOL).flatMap((_line) => {
    const line = _line.trim()

    if (!line) {
      return []
    }

    return ['-m', line]
  })

  const [err] = await safeAwait(
    execa('git', ['commit', '--allow-empty', ...messageFlags], {
      cwd: workdir,
      stderr: 'inherit',
      stdout: 'inherit'
    })
  )

  if (err) {
    throw new DevOpsError('Failed to create a commit', {
      err,
      traceTag: '25364a3f8b4348afb5abfff992dec5ca'
    })
  }

  logger.debug('Empty commit created')
}
