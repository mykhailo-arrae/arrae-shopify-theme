import type { Logger } from '../logger/index.js'
import { workdir } from '../process/workdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'

export type LogBranchDiffSummaryInput = {
  logLevel?: 'info' | 'debug' | 'trace'
  logger: Logger
  theirBranchName: string
}

export const logBranchDiffSummary = async ({
  logLevel = 'info',
  logger,
  theirBranchName
}: LogBranchDiffSummaryInput): Promise<string[]> => {
  const { execa } = await import('execa9')

  const { stdout: _summary } = await execa(
    'git',
    ['diff', '--compact-summary', theirBranchName],
    { cwd: workdir, timeout: 5 * MINUTE_IN_MS }
  )

  const details = _summary.split('\n').filter((line) => line.length)

  logger[logLevel]('Difference with {theirBranchName}: {summary}\n{report}', {
    theirBranchName,
    summary: details.at(-1),
    report: details.slice(0, -1).join('\n')
  })

  return details
}
