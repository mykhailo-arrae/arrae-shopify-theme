import { DevOpsError } from '../errors/index.js'
import type { Logger } from '../logger/index.js'
import { gitdir } from '../process/gitdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'
import { isPresent } from '../typescript/is-present.js'
import type { SimpleGit } from './index.js'

export type Pathspec = {
  patterns: string[]
  skipDeleted?: boolean
}

export type CommitMessage =
  | {
      mode: 'plain'
      line: string
    }
  | {
      mode: 'prefer-filename'
      line: string
    }

export type DecorateCommitMessage = (
  message: string
) => [string, string | null | undefined]

type AddWithCommitInput = {
  git: SimpleGit
  logger: Logger
  pathspecs: Pathspec[]
  commitMessage: CommitMessage
  decorateCommitMessage?: DecorateCommitMessage
}

/**
 * Stage files easier with git
 *
 * The helper doesn't throw on missing folders or files, it prints a warning instead. For example:
 *
 * ```ts
 * addWithCommit({ ...settings, pathspecs: [{ pathspec: 'my-folder' }] })
 * ```
 *
 * will produce a warning if `my-folder` doesn't exist, but will not throw.
 */
export const addWithCommit = async ({
  git,
  logger,
  pathspecs: _pathspecs,
  commitMessage,
  decorateCommitMessage = (m) => [m, null]
}: AddWithCommitInput): Promise<void> => {
  const pathspecs = _pathspecs.filter((p) => {
    return (
      p.patterns.length > 0 && p.patterns.every((pattern) => pattern.length > 0)
    )
  })

  if (pathspecs.length === 0) {
    throw new DevOpsError('At least one pathspec is required', {
      commitMessage,
      pathspecs: _pathspecs,
      traceTag: '051fdb71fb574388a08ff662c82c6a1d'
    })
  }

  const { execa } = await import('execa9')

  for (const p of pathspecs) {
    const { patterns, skipDeleted = false } = p

    const result = await execa(
      'git',
      ['add', skipDeleted ? '--ignore-removal' : null, ...patterns].filter(
        isPresent
      ),
      {
        cwd: gitdir,
        lines: true,
        reject: false,
        timeout: 5 * MINUTE_IN_MS
      }
    )

    const level = result.failed ? 'debug' : 'trace'

    result.stdout.forEach((line) => {
      logger[level](line)
    })

    result.stderr.forEach((line) => {
      logger[level](line)
    })

    if (result.failed) {
      logger.warn('Failed to stage files: {message}\nPatterns: {patterns}', {
        message: result.shortMessage,
        patterns: patterns.join(', ')
      })
    }
  }

  const { staged } = await git.status()

  if (staged.length === 0) {
    logger.info('No changes to commit', { commitMessage, pathspecs })
    return
  }

  const message =
    commitMessage.mode === 'prefer-filename' && staged.length === 1
      ? staged.join('')
      : commitMessage.line.split('\n').join(' ').trim()

  const decoratedMessage = decorateCommitMessage(message)
    .filter(isPresent)
    .join('\n\n')
    .trim()

  logger.debug('Committing: {message}', { message, staged })

  const { commit, summary } = await git.commit(decoratedMessage)

  logger.info('Commit created: {message}', { message, commit, summary })
}
