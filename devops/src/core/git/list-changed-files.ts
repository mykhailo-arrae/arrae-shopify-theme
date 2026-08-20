import Path from 'node:path'
import { $ } from 'bun'
import { DevOpsError } from '../errors/index.js'
import { asSubPath } from '../fs/as-subpath.js'
import type { Logger } from '../logger/index.js'
import { gitdir } from '../process/gitdir.js'
import { themedir } from '../process/themedir.js'

const parseRev = async (rev: string): Promise<string> => {
  const revResult = await $`git rev-parse ${rev}`.cwd(gitdir).nothrow().quiet()

  if (revResult.exitCode !== 0) {
    throw new DevOpsError('Failed to parse revision', {
      rev,
      exitCode: revResult.exitCode
    })
  }

  return revResult.text().trim()
}

export type Output = {
  isAtHead: boolean
  files: string[]
}

export const listChangedFiles = async ({
  logger,
  compareWith
}: {
  logger: Logger
  compareWith: string
}): Promise<Output> => {
  if (compareWith.length === 0) {
    throw new DevOpsError('Invalid compare with revision argument', {
      compareWith
    })
  }

  const headRev = await parseRev('HEAD')
  const compareWithRev = await parseRev(compareWith)

  const gitStatus = await $`git status --porcelain`
    .cwd(gitdir)
    .nothrow()
    .quiet()

  const workingCopyIsClean: boolean =
    gitStatus.exitCode === 0 && gitStatus.stdout.toString().trim().length === 0

  const isAtHead: boolean = headRev === compareWithRev && workingCopyIsClean

  // TODO Remove bash/xargs usage in favor of multiple Bun commands

  // 1. Show difference with the main branch or specific commit
  // 2. List unstaged files in working copy
  // 3. List staged files
  // 4. List untracked files
  const result = await $`
(printf ".gitignore\0" \
  && git diff -z --name-only --diff-filter=ACMRT ${compareWith}...HEAD \
  && git diff -z --name-only --diff-filter=ACMRT \
  && git diff -z --name-only --cached --diff-filter=ACMRT \
  && git ls-files -z --others --exclude-standard) \
  | xargs -0 -I{} bash -c 'test -e "{}" && printf "%s\0" "{}" || exit 0' \
  | xargs -0 rg --files-without-match 'build-fingerprint' \
  | sort -h \
  | uniq
`
    .cwd(gitdir)
    .nothrow()
    .quiet()

  result.stderr
    .toString()
    .trim()
    .split('\n')
    .forEach((line) => {
      if (line) {
        logger.error(line)
      }
    })

  if (result.exitCode !== 0) {
    throw new DevOpsError('Failed to list changed files', {
      exitCode: result.exitCode
    })
  }

  const _files = result.text().trim().split('\n')

  const files = _files.flatMap((file) => {
    const dirname = Path.dirname(file)
    const atThemeDir = asSubPath({
      parent: themedir,
      child: dirname,
      cwd: gitdir
    })

    if (dirname === '.') {
      logger.trace('Skipping file in root directory', { file, dirname })
      return []
    }

    if (atThemeDir === 'assets') {
      logger.trace('Skipping file in assets directory', { file, dirname })
      return []
    }

    return [file]
  })

  return {
    isAtHead,
    files
  }
}
