import { mkdir } from 'node:fs/promises'
import Path from 'node:path'
import { DevOpsError } from '../errors/index.js'
import type { Logger } from '../logger/index.js'
import { gitdir } from '../process/gitdir.js'
import { tmpdir } from '../process/tmpdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'

const stashdir = Path.resolve(tmpdir, `stash-files`)

type StashFilesInput = {
  logger: Logger
  paths: string[]
}

/**
 * Stash files or folders from the workdir to a temporary folder
 */
export const stashFiles = async ({
  logger,
  paths
}: StashFilesInput): Promise<void> => {
  const { execa } = await import('execa9')

  await mkdir(stashdir, { recursive: true })

  for (const _path of paths) {
    // Preserve directory structure by using relative paths
    const path = Path.relative(gitdir, Path.resolve(gitdir, _path))

    logger.trace('Stashing file or folder: {path}', { path })

    const result = await execa('cp', ['--parents', '-Raf', path, stashdir], {
      cwd: gitdir,
      lines: true,
      reject: false,
      timeout: 5 * MINUTE_IN_MS
    })

    const level = result.failed ? 'debug' : 'trace'

    result.stdout.forEach((line) => {
      logger[level](line)
    })

    result.stderr.forEach((line) => {
      logger[level](line)
    })

    if (result.failed) {
      logger.error('Failed to stash files: {message}', {
        message: result.shortMessage
      })
      throw new DevOpsError('Failed to stash files', { path })
    }
  }

  logger.info('Files stashed')
}

type RestoreFilesFromStashInput = {
  logger: Logger
  paths: string[]
}

/**
 * Restore stashed files or folders from the temporary folder to the workdir
 */
export const restoreFilesFromStash = async ({
  logger,
  paths
}: RestoreFilesFromStashInput): Promise<void> => {
  const { execa } = await import('execa9')

  for (const _path of paths) {
    // Preserve directory structure by using relative paths
    const path = Path.relative(stashdir, Path.resolve(stashdir, _path))

    logger.trace('Restoring file or folder: {path}', { path })

    const result = await execa('cp', ['--parents', '-Raf', path, gitdir], {
      cwd: stashdir,
      lines: true,
      reject: false,
      timeout: 5 * MINUTE_IN_MS
    })

    const level = result.failed ? 'debug' : 'trace'

    result.stdout.forEach((line) => {
      logger[level](line)
    })

    result.stderr.forEach((line) => {
      logger[level](line)
    })

    if (result.failed) {
      logger.error('Failed to restore files: {message}', {
        message: result.shortMessage
      })
      throw new DevOpsError('Failed to restore files', { path })
    }
  }

  logger.info('Files restored')
}
