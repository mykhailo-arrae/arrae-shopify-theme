import clsx from 'clsx'

export const generateContainerClassnames = (
  classnames: string[],
  stylenames: Record<string, string | undefined>
): string => {
  const modularizedClassnames = classnames.map((classname): string | null => {
    const hashed = stylenames[classname]

    if (hashed) {
      return hashed
    }

    return classname.startsWith('global:')
      ? classname.replace('global:', '')
      : null
  })

  return clsx('portable-snippet', modularizedClassnames)
}
