import { gitdir } from '../process/gitdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'

export const clearWorkingCopy = async (): Promise<void> => {
  const { execa } = await import('execa9')

  const childProcess = execa(
    'git',
    ['stash', 'push', '--include-untracked', '--quiet'],
    {
      cwd: gitdir,
      timeout: 5 * MINUTE_IN_MS
    }
  )
  childProcess.stdout?.pipe(process.stdout)
  childProcess.stderr?.pipe(process.stderr)

  await childProcess
}
