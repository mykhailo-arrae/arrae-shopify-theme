import Path from 'node:path'
import { DevOpsError } from '../errors/index.js'

export type Input = {
  parent: string
  child: string
  cwd: string
}

export const asSubPath = ({ parent, child, cwd }: Input): string | null => {
  try {
    const resolvedParent = Path.resolve(cwd, parent)
    const resolvedChild = Path.resolve(cwd, child)

    const relative = Path.relative(resolvedParent, resolvedChild)

    const isSubPath: boolean =
      Boolean(relative) &&
      !relative.startsWith('..') &&
      !Path.isAbsolute(relative)

    return isSubPath ? relative : null
  } catch (err: unknown) {
    throw new DevOpsError('Failed to resolve subpath', { err, parent, child })
  }
}
