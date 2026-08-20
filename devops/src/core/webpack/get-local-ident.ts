import Path from 'node:path'
import { kebabCase } from '../string/kebab-case.js'

export type CreateHash = (algorithm: string) => {
  update: (data: Buffer) => void
  digest: (algorithm: string) => string
}

export type Context = {
  rootContext: string
  resourcePath: string
  utils: {
    createHash: CreateHash
  }
}

/**
 * Generate a custom local identificator name for CSS modules imported by rspack.
 */
export const makeGetLocalIdent = ({
  assetFilePrefix
}: {
  assetFilePrefix: string | null
}) => {
  return (
    context: Context,
    fallbackLocalIdentName: unknown,
    _localName: string
  ): string => {
    const {
      rootContext,
      resourcePath,
      utils: { createHash }
    } = context

    const localName = _localName || 'unknown_selector'

    const Hash = createHash('xxhash64')
    Hash.update(Buffer.from(`${resourcePath}:::${localName}`))
    const hash = Hash.digest('hex')

    const path = Path.relative(
      rootContext,
      Path.resolve(rootContext, resourcePath)
    )

    const folders = Path.dirname(path).split(Path.sep)

    const _breadcrumbs = folders.flatMap((_f) => {
      const f = kebabCase(_f).replace(/-/g, '_')

      if (f === '') {
        return []
      }

      if (f === 'js_dist') {
        return []
      }

      if (f === 'js') {
        return []
      }

      if (f === 'src') {
        return []
      }

      return [f]
    })

    const breadcrumbs = _breadcrumbs.length > 0 ? _breadcrumbs : ['modules']

    const ident = [assetFilePrefix || 'mod', ...breadcrumbs, hash, localName]
      .filter((segment) => segment)
      .join('_')

    return ident
  }
}
