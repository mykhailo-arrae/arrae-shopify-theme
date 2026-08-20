export type CssLoaderModule = [
  string | number | null,
  string,
  string?,
  unknown?,
  string?,
  string?
]

export type IngestCssLoaderModules = (
  modules: CssLoaderModule[] | string,
  media?: string,
  dedupe?: boolean,
  supports?: string,
  layer?: string
) => void

export type _CssLoaderApiList = CssLoaderModule[] & {
  toString: () => string
  i?: IngestCssLoaderModules
  locals?: Record<string, string>
}

export type CssLoaderApiList = _CssLoaderApiList & {
  toString: () => string
  i: IngestCssLoaderModules
  locals?: Record<string, string>
}

/**
 * Simplified css loader api list factory from the webpack css loader api.
 */
export const cssLoaderApiImportFn = (): CssLoaderApiList => {
  /**
   * We need this type guard because we construct the list incrementally.
   */
  const isCssLoaderApiList = (
    value: _CssLoaderApiList
  ): value is CssLoaderApiList => {
    return (
      Array.isArray(value) &&
      'i' in value &&
      typeof value.i === 'function' &&
      typeof value.toString === 'function'
    )
  }

  // No source map support
  const cssWithMappingToString = (i: CssLoaderModule) => i[1]

  const list: _CssLoaderApiList = []

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map((item) => {
      let content = ''

      if (item[4]) {
        content += `@supports (${item[4]}) {`
      }

      if (item[2]) {
        content += `@media ${item[2]} {`
      }

      const layer = item[5]

      if (layer != null) {
        content += `@layer${layer.length > 0 ? ` ${layer}` : ''} {`
      }

      content += cssWithMappingToString(item)

      if (layer != null) {
        content += '}'
      }

      if (item[2]) {
        content += '}'
      }

      if (item[4]) {
        content += '}'
      }

      return content
    }).join('')
  }

  // import a list of modules into the list
  list.i = function i(modules) {
    if (typeof modules === 'string') {
      modules = [[null, modules, undefined]]
    }

    for (const module of modules) {
      list.push(module)
    }
  } satisfies IngestCssLoaderModules

  if (!isCssLoaderApiList(list)) {
    throw new Error('Expected css loader api list')
  }

  return list
}

export const cssLoaderApiImport = cssLoaderApiImportFn.toString()
