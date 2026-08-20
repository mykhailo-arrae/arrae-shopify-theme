import Path from 'node:path'

const entrypointPathRe = /index\.(js|ts|tsx)$/

export const inferBundleDef = ({
  path: _path,
  parentFolder,
  workdir
}: {
  path: string
  parentFolder: string
  workdir: string
}): { name: string; path: string } | null => {
  const path = Path.relative(
    Path.resolve(workdir, parentFolder),
    Path.resolve(workdir, _path)
  )

  if (entrypointPathRe.test(path) === false) {
    return null
  }

  const pathParts = path.split(Path.sep)

  // The path should be 'folderName/fileName'
  if (pathParts.length !== 2) {
    return null
  }

  const name = pathParts.at(0)

  if (name == null) {
    return null
  }

  return { name, path: Path.join(parentFolder, path) }
}
