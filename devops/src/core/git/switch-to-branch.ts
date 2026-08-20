import { DevOpsError } from '../errors/index.js'
import type { Logger } from '../logger/index.js'
import type { SimpleGit } from './index.js'

export const CurrentBranch = Symbol('current-branch')
export type CurrentBranch = typeof CurrentBranch

export type RemoteBranchName = `origin/${string}`

export type InferBranchNameResult =
  | {
      status: 'ok'
      baseBranchName: string
    }
  | { status: 'noop'; message: string; details?: Record<string, unknown> }
  | { status: 'error'; message: string; details?: Record<string, unknown> }

export type BaseBranchCandidates = (RemoteBranchName | CurrentBranch)[]

export type InferBaseBranchNameInput = {
  targetBranchName: string
  allBranches: string[]
  currentBranchName: string
  baseBranchCandidates: BaseBranchCandidates
}

export const _inferBaseBranchName = ({
  allBranches: _allBranches,
  baseBranchCandidates,
  currentBranchName: _currentBranchName,
  targetBranchName
}: InferBaseBranchNameInput): InferBranchNameResult => {
  const allBranches = _allBranches
    .flatMap((branch) => {
      if (branch.startsWith('remotes/')) {
        return [branch.replace('remotes/', '')]
      }
      return [branch]
    })
    .sort()

  if (allBranches.some((branch) => branch.startsWith('origin/')) === false) {
    return {
      status: 'error',
      message: 'No remote branches found',
      details: { branches: _allBranches }
    }
  }

  if (baseBranchCandidates.length === 0) {
    return {
      status: 'error',
      message: 'No base branch candidates provided',
      details: { allBranches, baseBranchCandidates }
    }
  }

  if (targetBranchName == null || targetBranchName.length === 0) {
    return {
      status: 'error',
      message: 'Target branch name is invalid',
      details: { targetBranchName }
    }
  }

  const currentBranchName: string | null =
    allBranches.find((branch) => branch.endsWith(_currentBranchName)) ?? null

  if (
    currentBranchName === targetBranchName ||
    currentBranchName === `origin/${targetBranchName}`
  ) {
    return {
      status: 'noop',
      message: 'Already on target branch',
      details: { currentBranchName, targetBranchName }
    }
  }

  if (allBranches.includes(targetBranchName)) {
    return {
      status: 'ok',
      baseBranchName: targetBranchName
    }
  }

  if (allBranches.includes(`origin/${targetBranchName}`)) {
    return {
      status: 'ok',
      baseBranchName: `origin/${targetBranchName}`
    }
  }

  const baseBranchName: string | null = baseBranchCandidates.reduce<
    string | null
  >((winner, candidate) => {
    if (winner != null) {
      return winner
    }

    if (candidate === CurrentBranch) {
      return currentBranchName
    }

    if (allBranches.includes(candidate)) {
      return candidate
    }

    return null
  }, null)

  if (baseBranchName == null) {
    return {
      status: 'error',
      message: 'Base branch name is invalid',
      details: {
        allBranches,
        targetBranchName
      }
    }
  }

  return {
    status: 'ok',
    baseBranchName
  }
}

export type SwitchToBranchInput = {
  git: SimpleGit
  logger: Logger
  baseBranchCandidates: BaseBranchCandidates
  targetBranchName: string
}

export const switchToBranch = async ({
  git,
  logger,
  baseBranchCandidates,
  targetBranchName
}: SwitchToBranchInput): Promise<void> => {
  logger.trace('Retrieving branch list')
  const { current: currentBranchName, all: allBranches } = await git.branch()

  const baseBranchNameResult = _inferBaseBranchName({
    allBranches,
    currentBranchName,
    targetBranchName,
    baseBranchCandidates
  })

  if (baseBranchNameResult.status === 'error') {
    throw new DevOpsError(baseBranchNameResult.message, {
      ...baseBranchNameResult.details,
      traceTag: 'c76f0fb479b943a0bd1d10a377777777'
    })
  }

  if (baseBranchNameResult.status === 'noop') {
    logger.info('{message}', {
      ...baseBranchNameResult.details,
      message: baseBranchNameResult.message,
      traceTag: '972c3a5736544337a015bd076bebf15b'
    })
    return
  }

  baseBranchNameResult.status satisfies 'ok'

  const { baseBranchName } = baseBranchNameResult

  logger.debug('Switching to {targetBranchName} branch', {
    allBranches,
    currentBranchName,
    baseBranchName,
    targetBranchName
  })

  await git
    .branch(['-f', '--no-track', targetBranchName, baseBranchName])
    .checkout(targetBranchName)

  logger.info('Switched to {targetBranchName} branch', { targetBranchName })
}
