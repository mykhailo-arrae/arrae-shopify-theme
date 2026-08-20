import test from 'ava'
import {
  _inferBaseBranchName,
  CurrentBranch,
  type InferBaseBranchNameInput,
  type InferBranchNameResult
} from './switch-to-branch.js'

const macro = test.macro<[InferBaseBranchNameInput, InferBranchNameResult]>({
  exec: (t, input, expected) => {
    const actual = _inferBaseBranchName(input)
    t.like(actual, expected)
  },
  title: (providedTitle = '') => {
    return providedTitle.trim()
  }
})

test(
  'given target branch exists locally should switch to it',
  macro,
  {
    allBranches: [
      'main',
      'uat/my-store',
      'remotes/origin/main',
      'remotes/origin/uat/my-store'
    ],
    currentBranchName: 'main',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/main', CurrentBranch]
  },
  { status: 'ok', baseBranchName: 'uat/my-store' }
)

test(
  'given target branch exists in origin should switch to it',
  macro,
  {
    allBranches: ['main', 'remotes/origin/main', 'remotes/origin/uat/my-store'],
    currentBranchName: 'main',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/main', CurrentBranch]
  },
  { status: 'ok', baseBranchName: 'origin/uat/my-store' }
)

test(
  'given current branch is already target branch should do nothing',
  macro,
  {
    allBranches: ['main', 'remotes/origin/main', 'remotes/origin/uat/my-store'],
    currentBranchName: 'uat/my-store',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/main', CurrentBranch]
  },
  { status: 'noop', message: 'Already on target branch' }
)

test(
  'given non-existing target branch should fallback to first base branch candidate from the list',
  macro,
  {
    allBranches: [
      'remotes/origin/devops/base',
      'remotes/origin/devops/test',
      'remotes/origin/main'
    ],
    currentBranchName: 'devops/test',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/devops/base', 'origin/main', CurrentBranch]
  },
  { status: 'ok', baseBranchName: 'origin/devops/base' }
)

test(
  'given non-existing target branch should fallback to current branch as first base branch candidate',
  macro,
  {
    allBranches: ['remotes/origin/devops/test', 'remotes/origin/main'],
    currentBranchName: 'devops/test',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: [CurrentBranch, 'origin/main']
  },
  { status: 'ok', baseBranchName: 'origin/devops/test' }
)

test(
  'given non-existing target branch should fallback to origin/main as first base branch candidate',
  macro,
  {
    allBranches: ['main', 'remotes/origin/main'],
    currentBranchName: 'main',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/main', CurrentBranch]
  },
  { status: 'ok', baseBranchName: 'origin/main' }
)

test(
  'given no remote branches should return error',
  macro,
  {
    allBranches: ['main', 'uat/my-store'],
    currentBranchName: 'main',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: ['origin/main']
  },
  { status: 'error', message: 'No remote branches found' }
)

test(
  'given no base branch candidates should return error',
  macro,
  {
    allBranches: ['main', 'remotes/origin/uat/my-store'],
    currentBranchName: 'main',
    targetBranchName: 'uat/my-store',
    baseBranchCandidates: []
  },
  { status: 'error', message: 'No base branch candidates provided' }
)
