import browserslist from 'browserslist'

type TargetMap = Record<string, number | null>

export const parseBrowsersList = (targets: string[]): string[] => {
  const esbuildTargetNames = [
    'chrome',
    'edge',
    'firefox',
    'ios',
    'opera',
    'safari'
  ]

  const targetMap = targets.reduce<TargetMap>((acc, target) => {
    const [__name, _ver] = target.split(' ')

    const _name = __name?.trim()
    const name = _name === 'ios_saf' ? 'ios' : _name

    if (!name || esbuildTargetNames.includes(name) === false) {
      return acc
    }

    const ver = _ver?.trim()

    if (!ver) {
      return acc
    }

    const __minVer = ver.split('-').at(0)?.trim()

    if (!__minVer) {
      return acc
    }

    const _minVer = Number.parseFloat(__minVer)
    const minVer = Number.isNaN(_minVer) ? null : _minVer

    if (minVer == null || minVer <= 0) {
      return acc
    }

    const existing = acc[name]

    if (existing == null) {
      acc[name] = minVer
      return acc
    }

    acc[name] = Math.min(existing, minVer)
    return acc
  }, {})

  return Object.entries(targetMap).flatMap(([name, version]) => {
    if (!name || !version) {
      return []
    }

    return [`${name}${version}`]
  })
}

type Queries = string | readonly string[] | null

export const inferEsbuildTargetsFromBrowserslist = (
  queries?: Queries
): string[] => {
  const targets = browserslist(queries)

  return parseBrowsersList(targets)
}
