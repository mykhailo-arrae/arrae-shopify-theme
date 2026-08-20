import fs from 'node:fs/promises'
import Path from 'node:path'
import { workdir } from '../process/workdir.js'

const pickFirstExistingPath = async (
  paths: string[]
): Promise<string | null> => {
  for (const path of paths) {
    const pathExists = await fs
      .stat(path)
      .then(() => true)
      .catch(() => false)

    if (pathExists) {
      return path
    }
  }

  return null
}

export const inferSourcePath = async (
  _path: string
): Promise<string | null> => {
  const path = Path.relative(workdir, Path.resolve(workdir, _path))
  const [, ...segments] = path.split(Path.sep)
  const filename = segments.pop()

  if (filename == null) {
    return null
  }

  const dirname = ['_js', ...segments].join(Path.sep)

  const tsxPath = Path.join(dirname, filename.replace(/\.js$/, '.tsx'))
  const tsPath = Path.join(dirname, filename.replace(/\.js$/, '.ts'))
  const jsPath = Path.join(dirname, filename)

  const sourcePath: string | null = await pickFirstExistingPath([
    tsxPath,
    tsPath,
    jsPath
  ])

  return sourcePath
}
