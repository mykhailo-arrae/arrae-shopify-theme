export type RspackModule = {
  identifier: () => string | null | undefined
}

export const inferRspackModuleFilePath = (
  identifier: string | null | undefined
): string | null => {
  if (identifier == null) {
    return null
  }

  // Remove file type prefixes
  const parts = identifier.split('|')

  const _resource = parts.length > 1 ? parts.at(1) : parts.at(0)

  if (_resource == null) {
    return null
  }

  // Remove loader prefixes
  const resource = _resource.split('!').at(-1)

  if (resource == null) {
    return null
  }

  return resource
}
