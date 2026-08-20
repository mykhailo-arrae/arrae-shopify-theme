import Path from 'node:path/posix'
import {
  inferRspackModuleFilePath,
  type RspackModule
} from './infer-module-file-path.js'

export const makeMatchSourceFolder = ({
  srcdir,
  workdir
}: {
  srcdir: string
  workdir: string
}) => {
  return (module: RspackModule): boolean => {
    const resource = inferRspackModuleFilePath(module.identifier())

    if (resource == null) {
      return false
    }

    if (resource.includes('node_modules')) {
      return false
    }

    const shortPath = Path.relative(Path.resolve(workdir, srcdir), resource)

    return shortPath.startsWith('../') ? false : true
  }
}
