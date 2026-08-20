import fs from 'node:fs/promises'
import Path from 'node:path'
import { gitdir } from '../process/gitdir.js'

export type PathItem = {
  path: string
  type: 'file' | 'directory'
}

const _checkFileTypes = async (paths: string[]): Promise<PathItem[]> => {
  return Promise.all(
    paths.map(async (p): Promise<PathItem> => {
      const stat = await fs.stat(p).catch(() => null)
      return {
        path: p,
        type: stat?.isDirectory() ? 'directory' : 'file'
      }
    })
  )
}

type Input = {
  paths: string[]
  cwd?: string
  checkFileTypes?: typeof _checkFileTypes
}

/**
 * Returns the minimal set of ancestor directories that cover all input paths.
 * Non-greedy: sibling directories are never collapsed into their parent.
 */
export const inferCommonDirs = async ({
  paths,
  cwd = gitdir,
  checkFileTypes = _checkFileTypes
}: Input): Promise<string[]> => {
  if (paths.length === 0) {
    return []
  }

  const resolved = [...new Set(paths.map((p) => Path.resolve(cwd, p)))]
  const typed = await checkFileTypes(resolved)

  const dirs = [
    ...new Set(
      typed.map((item) =>
        item.type === 'file' ? Path.dirname(item.path) : item.path
      )
    )
  ]

  dirs.sort((a, b) => a.split(Path.sep).length - b.split(Path.sep).length)

  const minimal: string[] = []
  for (const dir of dirs) {
    const covered = minimal.some(
      (ancestor) => dir === ancestor || dir.startsWith(ancestor + Path.sep)
    )
    if (!covered) {
      minimal.push(dir)
    }
  }

  return minimal.map((d) => Path.relative(cwd, d) || '.').sort()
}
