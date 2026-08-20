import { DevOpsError } from '../errors/index.js'
import { workdir } from '../process/workdir.js'
import { MINUTE_IN_MS } from '../time/constants.js'

type FetchThemeInput = {
  themeId: number
  clean?: boolean
}

export const fetchTheme = async ({
  themeId,
  clean = false
}: FetchThemeInput): Promise<void> => {
  if (Number.isNaN(themeId) || themeId <= 0) {
    throw new DevOpsError('Theme ID is invalid', {
      themeId,
      traceTag: '649687e5a31a4f96a90438e75854b1cd'
    })
  }

  const { execa } = await import('execa9')

  const fetchProcess = execa(
    'bb',
    [
      'run',
      clean ? 'fetch:clean_slate' : 'fetch',
      '--force',
      '-t',
      themeId.toString()
    ],
    {
      cwd: workdir,
      timeout: 5 * MINUTE_IN_MS
    }
  )
  fetchProcess.stdout.pipe(process.stdout)
  fetchProcess.stderr.pipe(process.stderr)

  await fetchProcess
}
