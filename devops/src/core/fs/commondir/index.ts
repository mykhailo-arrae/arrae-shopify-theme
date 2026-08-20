import Path from 'node:path'

export const commondir = (
  _files: (string | null | undefined)[],
  cwd = '/'
): string => {
  const files = _files.flatMap((r) => {
    if (!r) {
      return []
    }

    return [Path.resolve(cwd, r)]
  })

  if (files.length === 0) {
    return cwd
  }

  // Normalize and split all paths into components
  const pathComponents = files.map((file) => {
    // Normalize the path to handle double slashes and resolve dots
    const normalized = Path.normalize(file)
    // Split into components, filter out empty strings
    return normalized.split(Path.sep).filter((c) => c)
  })

  const firstPathComponents = pathComponents[0]
  if (!firstPathComponents) {
    return '/'
  }

  // Find the shortest path to limit our search
  const minLength = Math.min(
    ...pathComponents.map((components) => components.length)
  )

  // Find common prefix components
  const commonComponents: string[] = []

  for (let i = 0; i < minLength; i++) {
    const component = firstPathComponents[i]
    if (!component) {
      break
    }

    const allMatch = pathComponents.every((components) => {
      const currentComponent = components[i]
      return currentComponent && currentComponent === component
    })

    if (allMatch) {
      commonComponents.push(component)
    } else {
      break
    }
  }

  // Join back into a path
  if (commonComponents.length === 0) {
    return cwd
  }

  return '/' + commonComponents.join('/')
}
