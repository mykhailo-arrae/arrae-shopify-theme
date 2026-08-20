import { type SimpleGit, simpleGit } from 'simple-git'
import type { Logger } from '../logger/index.js'
import { inferMaxConcurrency } from '../process/concurrency.js'
import { gitdir as baseDir } from '../process/gitdir.js'

export type { SimpleGit } from 'simple-git'

export type InitGitInput = {
  logger: Logger
}

export const initGit = async ({ logger }: InitGitInput): Promise<SimpleGit> => {
  const maxConcurrentProcesses = inferMaxConcurrency((totalCores) => totalCores)

  logger.debug(
    'Working directory path: {baseDir}, max concurrency: {maxConcurrentProcesses}',
    { baseDir, maxConcurrentProcesses }
  )

  logger.debug('Configuring git')
  const git = simpleGit({
    baseDir,
    maxConcurrentProcesses,
    binary: 'git',
    progress: ({ method, stage, progress }) => {
      logger.trace(`git.${method} ${stage} stage ${progress}% complete`)
    },
    trimmed: true
  })

  logger.trace('Setting commit author details')
  await git
    .addConfig('user.name', 'Autobot', false, 'local')
    .addConfig('user.email', 'engineering@vaangroup.com', false, 'local')

  logger.trace('Adding `force-theirs` merge strategy')
  await git
    .addConfig('merge.force-theirs.name', 'Force Theirs', false, 'local')
    .addConfig(
      'merge.force-theirs.driver',
      `echo 'Force theirs - %P'; mv -f %B %A`,
      false,
      'local'
    )

  logger.info('Git configured successfully')
  return git
}
