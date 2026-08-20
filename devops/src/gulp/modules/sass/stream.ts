import type { Transform } from 'node:stream'
import { workdir } from '../../../core/process/workdir.js'

export const makeSassStream = async ({
  includePaths = []
}: {
  includePaths?: string[]
}): Promise<Transform> => {
  const { stream: execaStream } = await import('gulp-execa')

  return execaStream(({ path: filePath }) => {
    const loadPathArgs = includePaths.map((loadPath) =>
      ['--load-path', loadPath].join('=')
    )

    const command = [
      'sass',
      ...loadPathArgs,
      '--style=expanded',
      '--no-source-map',
      filePath
    ].join(' ')

    return {
      command,
      cwd: workdir,
      maxConcurrency: 2
    }
  })
}
